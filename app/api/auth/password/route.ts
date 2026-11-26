import { route } from "../../../../lib/api";
import * as auth from "../../../../lib/services/auth";

// PATCH /api/auth/password (KF-AUT-07, KF-USR-05: boleh diakses saat wajib ganti password)
export const PATCH = route(
  { allowPasswordChange: true },
  async ({ me, body }) => {
    const field = (k: string) => String(body.get(k) ?? "");
    await auth.changePassword(me, {
      oldPassword: field("oldPassword"),
      newPassword: field("newPassword"),
      confirmPassword: field("confirmPassword"),
    });
    return {
      ok: "Password berhasil diganti.",
      ...(me.mustChangePassword && { redirect: "/dashboard" }),
    };
  },
);
