import { idParam, route } from "../../../../../lib/api";
import * as users from "../../../../../lib/services/user";

// POST /api/users/:id/reset-password (SAD §9.7), khusus Admin
export const POST = route({ role: "ADMIN" }, ({ me, params }) =>
  users.resetPassword(me, idParam(params)),
);
