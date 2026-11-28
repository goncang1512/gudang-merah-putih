import { withTx, type Tx } from "../db";
import { correctionRepository as corrections } from "../repositories/correction";
import { transactionRepository as trxs } from "../repositories/transaction";
import { activityLogRepository as logs } from "../repositories/activityLog";
import { assertNonNegative } from "./stock";
import { cancelTransaction, createTransaction, type Line } from "./transaction";
import { HttpError, UserError } from "../form";
import { PAGE_SIZE } from "../utils";
import type { SessionUser } from "./auth";
import type {
  JenisPengajuan,
  StatusPengajuan,
} from "../../generated/prisma/client";

// CorrectionService (SAD §7.2, §9.6): approval workflow Petugas -> Admin.

// KF-KOR-03: Admin melihat semua pengajuan; Petugas hanya pengajuannya sendiri.
export async function list(
  me: SessionUser,
  status: StatusPengajuan | undefined,
  page: number,
) {
  const f = { status, requestedById: me.role === "ADMIN" ? undefined : me.id };
  const [rows, total] = await Promise.all([
    corrections.list(f, (page - 1) * PAGE_SIZE, PAGE_SIZE),
    corrections.count(f),
  ]);
  return { rows, total };
}

// KF-KOR-02: pengaju hanya untuk transaksi miliknya sendiri, alasan wajib
export async function request(
  me: SessionUser,
  r: {
    transactionId: number;
    type: JenisPengajuan;
    reason: string;
    lines: Line[];
  },
) {
  const trx = await trxs.findWithPendingRequests(r.transactionId);
  if (!trx) throw new HttpError(404, "Transaksi tidak ditemukan.");
  if (trx.createdById !== me.id)
    throw new HttpError(
      403,
      "Anda hanya bisa mengajukan koreksi untuk transaksi yang Anda input sendiri.",
    );
  if (trx.status !== "AKTIF")
    throw new UserError("Transaksi sudah dibatalkan.");
  if (trx.requests.length)
    throw new UserError(
      "Transaksi ini masih punya pengajuan yang menunggu keputusan Admin.",
    );

  let details: Line[] = [];
  if (r.type === "KOREKSI_JUMLAH") {
    details = r.lines.filter((l) =>
      trx.details.some((d) => d.itemId === l.itemId && d.qty !== l.qty),
    );
    if (!details.length)
      throw new UserError("Ubah minimal satu jumlah barang untuk koreksi.");
  }
  await withTx(async (tx) => {
    const req = await corrections.create(
      {
        transactionId: r.transactionId,
        type: r.type,
        reason: r.reason,
        requestedById: me.id,
        details: { create: details },
      },
      tx,
    );
    await logs.create(
      {
        userId: me.id,
        type: r.type === "PEMBATALAN" ? "Ajukan Pembatalan" : "Ajukan Koreksi",
        detail: `Pengajuan #${req.id} untuk ${trx.number}: ${r.reason}`,
      },
      tx,
    );
  });
}

// SAD §9.6: koreksi disetujui -> transaksi lama dibatalkan, transaksi pengganti dibuat dengan jumlah benar.
export async function applyCorrection(
  tx: Tx,
  requestId: number,
  adminId: number,
) {
  const req = await corrections.findById(requestId, tx);
  if (!req || req.status !== "MENUNGGU")
    throw new UserError("Pengajuan tidak ditemukan atau sudah diputuskan.");
  const old = await cancelTransaction(
    tx,
    req.transactionId,
    `Disetujui pengajuan #${req.id}: ${req.reason}`,
    adminId,
    { check: req.type === "PEMBATALAN" },
  );
  let replacement = null;
  if (req.type === "KOREKSI_JUMLAH") {
    const fix = new Map(req.details.map((d) => [d.itemId, d.qty]));
    replacement = await createTransaction(tx, {
      type: old.type,
      date: old.date,
      party: old.party,
      note: old.note,
      createdById: old.createdById,
      replacesId: old.id,
      lines: old.details.map((d) => ({
        itemId: d.itemId,
        qty: fix.get(d.itemId) ?? d.qty,
      })),
    });
    await assertNonNegative(
      tx,
      old.details.map((d) => d.itemId),
    );
  }
  await corrections.update(
    requestId,
    { status: "DISETUJUI", decidedById: adminId, decidedAt: new Date() },
    tx,
  );
  await logs.create(
    {
      userId: adminId,
      type:
        req.type === "PEMBATALAN" ? "Setujui Pembatalan" : "Setujui Koreksi",
      detail: `Pengajuan #${req.id} untuk ${old.number}`,
      oldValue: old.details.map((d) => `${d.item.name}: ${d.qty}`).join(", "),
      newValue: replacement
        ? `${replacement.number} (` +
          req.details
            .map(
              (d) =>
                `${old.details.find((o) => o.itemId === d.itemId)?.item.name}: ${d.qty}`,
            )
            .join(", ") +
          ")"
        : "DIBATALKAN",
    },
    tx,
  );
  return { old, replacement };
}

// KF-KOR-03 dan KF-KOR-06
export async function decide(me: SessionUser, id: number, approve: boolean) {
  if (approve) {
    const { old, replacement } = await withTx((tx) =>
      applyCorrection(tx, id, me.id),
    );
    return replacement
      ? `Koreksi disetujui. ${old.number} dibatalkan, diganti ${replacement.number}.`
      : `Pembatalan ${old.number} disetujui.`;
  }
  const req = await corrections.findById(id);
  if (!req || req.status !== "MENUNGGU")
    throw new UserError("Pengajuan tidak ditemukan atau sudah diputuskan.");
  await withTx(async (tx) => {
    await corrections.update(
      id,
      { status: "DITOLAK", decidedById: me.id, decidedAt: new Date() },
      tx,
    );
    await logs.create(
      {
        userId: me.id,
        type: req.type === "PEMBATALAN" ? "Tolak Pembatalan" : "Tolak Koreksi",
        detail: `Pengajuan #${id} untuk ${req.transaction.number}`,
      },
      tx,
    );
  });
  return "Pengajuan ditolak.";
}
