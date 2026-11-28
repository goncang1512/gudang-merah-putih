import { idParam, route } from "../../../../lib/api";
import * as corrections from "../../../../lib/services/correction";
import { oneOf } from "../../../../lib/form";

// PATCH /api/corrections/:id {decision: DISETUJUI|DITOLAK} (SAD §9.6, KF-KOR-03), khusus Admin
export const PATCH = route({ role: "ADMIN" }, ({ me, body, params }) =>
  corrections.decide(
    me,
    idParam(params),
    oneOf(body, "decision", "Keputusan", ["DISETUJUI", "DITOLAK"] as const) ===
      "DISETUJUI",
  ),
);
