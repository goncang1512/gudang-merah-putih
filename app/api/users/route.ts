import { route } from "../../../lib/api";
import * as users from "../../../lib/services/user";
import { oneOf, text, UserError } from "../../../lib/form";

// GET/POST /api/users (SAD §11.2), khusus Admin
export const GET = route({ role: "ADMIN" }, () => users.list());

export const POST = route({ role: "ADMIN" }, async ({ me, body }) => {
  const name = text(body, "name", "Nama", { max: 100 });
  const role = oneOf(body, "role", "Peran", [
    "ADMIN",
    "PETUGAS_GUDANG",
  ] as const);
  const username = text(body, "username", "Username", {
    max: 50,
  }).toLowerCase();
  if (!/^[a-z0-9._]+$/.test(username))
    throw new UserError(
      "Username hanya boleh huruf, angka, titik, dan garis bawah.",
    );
  await users.create(me, {
    name,
    username,
    role,
    password: String(body.get("password") ?? ""),
  });
  return "Pengguna berhasil ditambahkan.";
});
