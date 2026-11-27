import { route } from "../../../../lib/api";
import * as transactions from "../../../../lib/services/transaction";
import { transactionInput } from "../../../../lib/form";

// POST /api/transactions/inbound (SAD §9.3): Admin & Petugas Gudang
export const POST = route({}, ({ me, body }) =>
  transactions.inbound(me, transactionInput(body, "Nama pemasok")),
);
