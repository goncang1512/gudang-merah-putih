import { db, type Tx } from "../db";

// TransactionDetailRepository (SAD §7.3)
export const transactionDetailRepository = {
  // Total qty per barang dari transaksi AKTIF; out=false = stok awal + masuk, out=true = keluar (SAD §8.4)
  sumQty: (out: boolean, itemIds?: number[], until?: Date, tx: Tx = db) =>
    tx.transactionDetail.groupBy({
      by: ["itemId"],
      _sum: { qty: true },
      where: {
        ...(itemIds && { itemId: { in: itemIds } }),
        transaction: {
          status: "AKTIF",
          type: out ? "KELUAR" : { not: "KELUAR" },
          ...(until && { date: { lte: until } }),
        },
      },
    }),
  // ponytail: kartu stok memuat semua baris; tambah filter rentang tanggal jika riwayat sudah ribuan baris
  stockCard: (itemId: number) =>
    db.transactionDetail.findMany({
      where: { itemId },
      include: {
        transaction: { include: { createdBy: { select: { name: true } } } },
      },
      orderBy: [
        { transaction: { date: "asc" } },
        { transaction: { createdAt: "asc" } },
      ],
    }),
  initialStock: () =>
    db.transactionDetail.findMany({
      where: { transaction: { type: "STOK_AWAL", status: "AKTIF" } },
      include: { transaction: { select: { number: true } } },
    }),
  countInitial: (itemIds: number[], tx: Tx = db) =>
    tx.transactionDetail.count({
      where: {
        itemId: { in: itemIds },
        transaction: { type: "STOK_AWAL", status: "AKTIF" },
      },
    }),
};
