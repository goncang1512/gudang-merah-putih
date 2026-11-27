import { idParam, route } from "../../../../lib/api";
import * as categories from "../../../../lib/services/category";
import { text } from "../../../../lib/form";

// PATCH/DELETE /api/categories/:id, khusus Admin
export const PATCH = route({ role: "ADMIN" }, ({ me, body, params }) =>
  categories.save(
    me,
    text(body, "name", "Nama kategori", { max: 50 }),
    idParam(params),
  ),
);

export const DELETE = route({ role: "ADMIN" }, async ({ me, params }) => {
  await categories.remove(me, idParam(params));
  return "Kategori berhasil dihapus.";
});
