import { cookies } from "next/headers";
import { route } from "../../../../lib/api";
import * as auth from "../../../../lib/services/auth";
import { SESSION_COOKIE } from "../../../../lib/session";

// POST /api/auth/logout (SAD §11.2)
export const POST = route({ allowPasswordChange: true }, async ({ me }) => {
  await auth.logout(me);
  (await cookies()).delete(SESSION_COOKIE);
  return { ok: "Berhasil keluar.", redirect: "/login" };
});
