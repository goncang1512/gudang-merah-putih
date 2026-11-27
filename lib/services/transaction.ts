import { withTx, type Tx } from "../db";
import {
  transactionRepository as trxs,
  type TrxFilter,
} from "../repositories/transaction";
import { transactionDetailRepository as details } from "../repositories/transactionDetail";
import { itemRepository as items } from "../repositories/item";
import { correctionRepository as corrections } from "../repositories/correction";
import { activityLogRepository as logs } from "../repositories/activityLog";
import { assertNonNegative, lockItems, withStock } from "./stock";
import { UserError } from "../form";
import { jenisLabel, PAGE_SIZE, ymd } from "../utils";
import type { SessionUser } from "./auth";
import type { JenisTransaksi } from "../../generated/prisma/client";

// InboundTransactionService + OutboundTransactionService (SAD §7.2, §9.3, §9.4).
// Keduanya memakai alur simpan yang sama (SAD §4.4), bedanya hanya jenis dan cek stok.

const PREFIX: Record<JenisTransaksi, string> = {
  STOK_AWAL: "SA",
  MASUK: "BM",
  KELUAR: "BK",
};

// KF-BM-04 / KF-BK-05: BM-YYYYMMDD-001, urutan per jenis per tanggal.
async function nextNumber(tx: Tx, type: JenisTransaksi, date: Date) {
  const prefix = `${PREFIX[type]}-${ymd(date).replaceAll("-", "")}-`;
  await trxs.lockNumber(prefix, tx);
  const last = await trxs.lastNumber(prefix, tx);
  return (
    prefix + String(Number(last?.number.slice(-3) ?? 0) + 1).padStart(3, "0")
  );
}

export type Line = { itemId: number; qty: number };

export function mergeLines(lines: Line[]) {
  const m = new Map<number, number>();
  for (const l of lines) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty);
  return [...m].map(([itemId, qty]) => ({ itemId, qty }));
}

type NewTransaction = {
  type: JenisTransaksi;
  date: Date;
  party?: string | null;
  note?: string | null;
  lines: Line[];
  createdById: number;
  replacesId?: number;
};

// SAD §4.4: Validate Detail -> Validate Stock -> Save dalam satu unit kerja (dipanggil di dalam withTx).
export async function createTransaction(tx: Tx, t: NewTransaction) {
  const lines = mergeLines(t.lines);
  if (!lines.length) throw new UserError("Pilih minimal satu barang.");
  if (lines.some((l) => !Number.isInteger(l.qty) || l.qty <= 0))
    throw new UserError("Jumlah harus lebih dari 0.");
  const itemIds = lines.map((l) => l.itemId);
  await lockItems(itemIds, tx);
  if ((await items.countActive(itemIds, tx)) !== itemIds.length)
    throw new UserError("Ada barang yang tidak ditemukan atau sudah nonaktif.");

  const trx = await trxs.create(
    {
      number: await nextNumber(tx, t.type, t.date),
      type: t.type,
      date: t.date,
      party: t.party || null,
      note: t.note || null,
      createdById: t.createdById,
      replacesId: t.replacesId,
      details: { create: lines },
    },
    tx,
  );
  if (t.type === "KELUAR") await assertNonNegative(tx, itemIds);
  return trx;
}

// KF-KOR-04/05: transaksi tidak dihapus, hanya ditandai DIBATALKAN beserta alasan, penyetuju, dan waktu.
export async function cancelTransaction(
  tx: Tx,
  id: number,
  reason: string,
  adminId: number,
  { check = true } = {},
) {
  const trx = await trxs.findWithDetails(id, tx);
  if (!trx) throw new UserError("Transaksi tidak ditemukan.");
  if (trx.status !== "AKTIF")
    throw new UserError(`Transaksi ${trx.number} sudah dibatalkan.`);
  const itemIds = trx.details.map((d) => d.itemId);
  await lockItems(itemIds, tx);
  await trxs.update(
    id,
    {
      status: "DIBATALKAN",
      cancelReason: reason,
      cancelledById: adminId,
      cancelledAt: new Date(),
    },
    tx,
  );
  if (check) await assertNonNegative(tx, itemIds);
  return trx;
}

// KF-BM-07 / KF-BK-07
export async function list(f: TrxFilter, page: number) {
  const [rows, total] = await Promise.all([
    trxs.list(f, (page - 1) * PAGE_SIZE, PAGE_SIZE),
    trxs.count(f),
  ]);
  return { rows, total };
}

type Input = { date: Date; party: string; note: string; lines: Line[] };

async function record(me: SessionUser, type: "MASUK" | "KELUAR", input: Input) {
  const trx = await withTx(async (tx) => {
    const t = await createTransaction(tx, {
      ...input,
      type,
      createdById: me.id,
    });
    const lines = mergeLines(input.lines);
    await logs.create(
      {
        userId: me.id,
        type: jenisLabel[type],
        detail: `${t.number}: ${lines.length} barang, total ${lines.reduce((a, l) => a + l.qty, 0)} ke/dari ${input.party}`,
      },
      tx,
    );
    return t;
  });
  return `Transaksi ${trx.number} berhasil disimpan.`;
}

export const inbound = (me: SessionUser, input: Input) =>
  record(me, "MASUK", input); // KF-BM-01..05
export const outbound = (me: SessionUser, input: Input) =>
  record(me, "KELUAR", input); // KF-BK-01..06

// KF-KOR-04: Admin bisa langsung membatalkan transaksi dengan alasan
export async function cancelDirect(
  me: SessionUser,
  id: number,
  reason: string,
) {
  const trx = await withTx(async (tx) => {
    const t = await cancelTransaction(tx, id, reason, me.id);
    await corrections.rejectPendingFor(id, me.id, tx);
    await logs.create(
      {
        userId: me.id,
        type: "Batalkan Transaksi",
        detail: `${t.number}: ${reason}`,
        oldValue: "AKTIF",
        newValue: "DIBATALKAN",
      },
      tx,
    );
    return t;
  });
  return `Transaksi ${trx.number} dibatalkan.`;
}

// KF-STK-05: stok awal dicatat sebagai transaksi STOK_AWAL tersendiri
export async function initialStatus() {
  const [active, initial] = await Promise.all([
    items.listActive(),
    details.initialStock(),
  ]);
  return { items: await withStock(active), initial };
}

export async function saveInitialStock(me: SessionUser, lines: Line[]) {
  if (!lines.length)
    throw new UserError("Isi stok awal minimal untuk satu barang.");
  const trx = await withTx(async (tx) => {
    if (
      await details.countInitial(
        lines.map((l) => l.itemId),
        tx,
      )
    )
      throw new UserError(
        "Sebagian barang sudah memiliki stok awal. Perubahan dilakukan lewat pengajuan koreksi.",
      );
    const t = await createTransaction(tx, {
      type: "STOK_AWAL",
      date: new Date(ymd(new Date())),
      note: "Inisialisasi stok awal",
      lines,
      createdById: me.id,
    });
    await logs.create(
      {
        userId: me.id,
        type: "Stok Awal",
        detail: `${t.number}: ${lines.length} barang`,
      },
      tx,
    );
    return t;
  });
  return `Stok awal tersimpan sebagai transaksi ${trx.number}.`;
}
