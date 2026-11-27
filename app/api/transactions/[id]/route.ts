import { idParam, route } from "../../../../lib/api";
import * as transactions from "../../../../lib/services/transaction";
import { text } from "../../../../lib/form";

export const PATCH = route({ role: "ADMIN" }, ({ me, body, params }) =>
  transactions.cancelDirect(
    me,
    idParam(params),
    text(body, "reason", "Alasan", { max: 500 }),
  ),
);
