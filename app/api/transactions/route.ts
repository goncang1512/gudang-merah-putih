import { route } from "../../../lib/api";
import * as transactions from "../../../lib/services/transaction";
import { optDate, optInt } from "../../../lib/form";

// GET /api/transactions?type=MASUK|KELUAR&dari=&sampai=&barang=&q=&status=&page= (SAD §11.2)
export const GET = route({}, ({ query, page }) => {
  const type = query.get("type"),
    status = query.get("status");
  return transactions.list(
    {
      type: type === "MASUK" || type === "KELUAR" ? type : undefined,
      from: optDate(query.get("dari")),
      to: optDate(query.get("sampai")),
      itemId: optInt(query.get("barang")),
      q: query.get("q") || undefined,
      status:
        status === "AKTIF" || status === "DIBATALKAN" ? status : undefined,
    },
    page,
  );
});
