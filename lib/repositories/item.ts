import { db, type Tx } from "../db";
import type { Prisma } from "../../generated/prisma/client";

// ItemRepository (SAD §7.3)
export type ItemFilter = {
  q?: string;
  categoryId?: number;
  onlyActive?: boolean;
};

const where = (f: ItemFilter): Prisma.ItemWhereInput => ({
  ...(f.q && {
    OR: [
      { name: { contains: f.q, mode: "insensitive" } },
      { code: { contains: f.q, mode: "insensitive" } },
    ],
  }),
  ...(f.categoryId && { categoryId: f.categoryId }),
  ...(f.onlyActive && { status: "AKTIF" }),
});

export const itemRepository = {
  list: (f: ItemFilter, skip: number, take: number) =>
    db.item.findMany({
      where: where(f),
      include: { category: true, _count: { select: { details: true } } },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
  count: (f: ItemFilter) => db.item.count({ where: where(f) }),
  listActive: (categoryId?: number) =>
    db.item.findMany({
      where: { status: "AKTIF", ...(categoryId && { categoryId }) },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
  findById: (id: number, tx: Tx = db) => tx.item.findUnique({ where: { id } }),
  findWithCategory: (id: number) =>
    db.item.findUnique({ where: { id }, include: { category: true } }),
  findWithUsage: (id: number) =>
    db.item.findUnique({
      where: { id },
      include: { _count: { select: { details: true } } },
    }),
  findByCode: (code: string, excludeId?: number | null) =>
    db.item.findFirst({
      where: { code, ...(excludeId && { NOT: { id: excludeId } }) },
    }),
  findNames: (ids: number[], tx: Tx = db) =>
    tx.item.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, unit: true },
    }),
  countActive: (ids: number[], tx: Tx = db) =>
    tx.item.count({ where: { id: { in: ids }, status: "AKTIF" } }),
  create: (data: Prisma.ItemUncheckedCreateInput, tx: Tx = db) =>
    tx.item.create({ data }),
  update: (id: number, data: Prisma.ItemUncheckedUpdateInput, tx: Tx = db) =>
    tx.item.update({ where: { id }, data }),
  delete: (id: number, tx: Tx = db) => tx.item.delete({ where: { id } }),
  // Row lock: dua transaksi bersamaan tidak bisa sama-sama lolos cek stok. `ids` harus terurut (hindari deadlock).
  lockRows: async (ids: number[], tx: Tx) => {
    if (ids.length)
      await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
  },
};
