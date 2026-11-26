import { cookies } from "next/headers";
import { route } from "../../../../lib/api";
import * as auth from "../../../../lib/services/auth";
import {
  SESSION_COOKIE,
  cookieOptions,
  signSession,
} from "../../../../lib/session";

// POST /api/auth/login (SAD §9.1, §11.2)
export const POST = route({ isPublic: true }, async ({ body }) => {
  const user = await auth.login(
    String(body.get("username") ?? "").trim(),
    String(body.get("password") ?? ""),
  );
  (await cookies()).set(SESSION_COOKIE, signSession(user.id), cookieOptions);
  return {
    ok: "Login berhasil.",
    redirect: user.mustChangePassword ? "/ganti-password" : "/dashboard",
  };
});
