import { route } from "../../../../lib/api";
import * as auth from "../../../../lib/services/auth";
import { text } from "../../../../lib/form";

// GET /api/auth/me: pengguna dari sesi aktif. PATCH: ubah nama profil sendiri.
export const GET = route({ allowPasswordChange: true }, async ({ me }) => me);

export const PATCH = route({}, async ({ me, body }) => {
  await auth.updateProfile(me, text(body, "name", "Nama", { max: 100 }));
  return "Profil berhasil disimpan.";
});
