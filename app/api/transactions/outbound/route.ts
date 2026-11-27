import { route } from "../../../../lib/api";
import * as transactions from "../../../../lib/services/transaction";
import { transactionInput } from "../../../../lib/form";

// POST /api/transactions/outbound (SAD §9.4): Admin & Petugas Gudang
export const POST = route({}, ({ me, body }) =>
  transactions.outbound(me, transactionInput(body, "Tujuan / penerima")),
);
