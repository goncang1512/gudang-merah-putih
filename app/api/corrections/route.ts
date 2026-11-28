import { route } from "../../../lib/api";
import * as corrections from "../../../lib/services/correction";
import { int, lines, oneOf, text } from "../../../lib/form";

const STATUSES = ["MENUNGGU", "DISETUJUI", "DITOLAK"] as const;

// GET /api/corrections?status=&page=: Admin semua, Petugas miliknya sendiri
export const GET = route({}, ({ me, query, page }) =>
  corrections.list(
    me,
    STATUSES.find((s) => s === query.get("status")),
    page,
  ),
);

// POST /api/corrections (SAD §9.6, KF-KOR-02)
export const POST = route({}, async ({ me, body }) => {
  const type = oneOf(body, "type", "Jenis pengajuan", [
    "KOREKSI_JUMLAH",
    "PEMBATALAN",
  ] as const);
  await corrections.request(me, {
    transactionId: int(body, "transactionId", "Transaksi", { min: 1 }),
    type,
    reason: text(body, "reason", "Alasan", { max: 500 }),
    lines: type === "KOREKSI_JUMLAH" ? lines(body) : [],
  });
  return "Pengajuan terkirim ke Admin.";
});
