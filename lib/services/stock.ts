import type { Tx } from "../db";
import { itemRepository as items } from "../repositories/item";
import { transactionDetailRepository as details } from "../repositories/transactionDetail";
import { HttpError, UserError } from "../form";

// StockService (SAD §7.2, §8.4). Stok tidak disimpan, selalu dihitung dari transaksi.

// KF-STK-01: stok = stok awal + masuk - keluar, hanya transaksi AKTIF. `until` untuk laporan per tanggal.
export async function stockOf(tx?: Tx, itemIds?: number[], until?: Date) {
  const [ins, outs] = await Promise.all([
    details.sumQty(false, itemIds, until, tx),
    details.sumQty(true, itemIds, until, tx),
  ]);
  const stock = new Map<number, number>();
  for (const r of ins) stock.set(r.itemId, r._sum.qty ?? 0);
  for (const r of outs)
    stock.set(r.itemId, (stock.get(r.itemId) ?? 0) - (r._sum.qty ?? 0));
  return stock;
}

export async function withStock<T extends { id: number }>(
  rows: T[],
  until?: Date,
) {
  const stock = await stockOf(
    undefined,
    rows.map((r) => r.id),
    until,
  );
  return rows.map((r) => ({ ...r, stock: stock.get(r.id) ?? 0 }));
}

export const lockItems = (itemIds: number[], tx: Tx) =>
  items.lockRows(
    [...new Set(itemIds)].sort((a, b) => a - b),
    tx,
  );

// Satu aturan untuk KF-BK-03 (keluar > stok) dan KF-KOR-06 (pembatalan membuat stok minus):
// setelah semua perubahan ditulis, tidak boleh ada stok barang terdampak yang negatif.
export async function assertNonNegative(tx: Tx, itemIds: number[]) {
  const stock = await stockOf(tx, itemIds);
  const minus = [...stock].filter(([, s]) => s < 0);
  if (!minus.length) return;
  const names = await items.findNames(
    minus.map(([id]) => id),
    tx,
  );
  throw new UserError(
    "Stok tidak cukup: " +
      names
        .map((i) => `${i.name} kurang ${-stock.get(i.id)!} ${i.unit}`)
        .join(", ") +
      ".",
  );
}

// GET /api/stock: stok terkini semua barang aktif (dipakai form barang keluar)
export async function current() {
  const active = await items.listActive();
  return withStock(
    active.map(({ id, code, name, unit, minStock }) => ({
      id,
      code,
      name,
      unit,
      minStock,
    })),
  );
}

// KF-STK-03: kartu stok per barang dengan sisa stok setelah tiap transaksi
export async function card(itemId: number) {
  const found = await items.findWithCategory(itemId);
  if (!found) throw new HttpError(404, "Barang tidak ditemukan.");
  const { purchasePrice: _hidden, ...item } = found;
  let balance = 0;
  const rows = (await details.stockCard(itemId)).map((r) => {
    const t = r.transaction,
      active = t.status === "AKTIF",
      out = t.type === "KELUAR";
    if (active) balance += out ? -r.qty : r.qty;
    return { r, t, active, out, balance };
  });
  return { item, rows, balance };
}
