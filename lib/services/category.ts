import { withTx } from "../db";
import { categoryRepository as categories } from "../repositories/category";
import { activityLogRepository as logs } from "../repositories/activityLog";
import { HttpError, UserError } from "../form";
import type { SessionUser } from "./auth";

export const list = () => categories.list();

export async function save(me: SessionUser, name: string, id?: number) {
  if (await categories.findByName(name, id))
    throw new UserError("Nama kategori sudah dipakai.");
  if (!id) {
    await withTx(async (tx) => {
      await categories.create(name, tx);
      await logs.create(
        { userId: me.id, type: "Tambah Kategori", detail: name },
        tx,
      );
    });
    return "Kategori berhasil ditambahkan.";
  }
  const old = await categories.findById(id);
  if (!old) throw new HttpError(404, "Kategori tidak ditemukan.");
  await withTx(async (tx) => {
    await categories.update(id, name, tx);
    await logs.create(
      {
        userId: me.id,
        type: "Ubah Kategori",
        detail: `Kategori #${id}`,
        oldValue: old.name,
        newValue: name,
      },
      tx,
    );
  });
  return "Kategori berhasil diubah.";
}

export async function remove(me: SessionUser, id: number) {
  const cat = await categories.findById(id);
  if (!cat) throw new HttpError(404, "Kategori tidak ditemukan.");
  if (cat._count.items)
    throw new UserError(
      `Kategori "${cat.name}" masih dipakai oleh ${cat._count.items} barang dan tidak bisa dihapus.`,
    ); // KF-MST-06
  await withTx(async (tx) => {
    await categories.delete(id, tx);
    await logs.create(
      { userId: me.id, type: "Hapus Kategori", detail: cat.name },
      tx,
    );
  });
}
