import { route } from "../../../lib/api";
import * as categories from "../../../lib/services/category";
import { text } from "../../../lib/form";

// GET /api/categories: semua pengguna (filter barang/laporan). POST: khusus Admin (SAD §9.2)
export const GET = route({}, () => categories.list());

export const POST = route({ role: "ADMIN" }, ({ me, body }) =>
  categories.save(me, text(body, "name", "Nama kategori", { max: 50 })),
);
