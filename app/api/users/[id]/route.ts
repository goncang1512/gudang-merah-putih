import { idParam, route } from "../../../../lib/api";
import * as users from "../../../../lib/services/user";
import { oneOf, text } from "../../../../lib/form";

// PATCH /api/users/:id (SAD §11.2): ubah nama, peran, status
export const PATCH = route({ role: "ADMIN" }, async ({ me, body, params }) => {
  await users.update(me, idParam(params), {
    name: text(body, "name", "Nama", { max: 100 }),
    role: oneOf(body, "role", "Peran", ["ADMIN", "PETUGAS_GUDANG"] as const),
    status: oneOf(body, "status", "Status", ["AKTIF", "NONAKTIF"] as const),
  });
  return "Pengguna berhasil diubah.";
});
