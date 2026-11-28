import { route } from "../../../../lib/api";
import * as transactions from "../../../../lib/services/transaction";
import { int } from "../../../../lib/form";

// GET/POST /api/stock/initial: stok awal (KF-STK-05), khusus Admin
export const GET = route({ role: "ADMIN" }, () => transactions.initialStatus());

export const POST = route({ role: "ADMIN" }, ({ me, body }) => {
  const qtys = body.getAll("qty");
  const lines = body
    .getAll("itemId")
    .map((id, i) => ({
      itemId: int(id, "Barang", "Barang", { min: 1 }),
      qty: String(qtys[i] ?? "").trim() ? int(qtys[i], "Stok awal") : 0,
    }))
    .filter((l) => l.qty > 0); // baris yang dikosongkan dilewati
  return transactions.saveInitialStock(me, lines);
});
