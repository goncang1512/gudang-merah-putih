import { db, type Tx } from "../db";

// CategoryRepository (SAD §7.3)
const withCount = { _count: { select: { items: true } } } as const;

export const categoryRepository = {
  list: () =>
    db.category.findMany({ orderBy: { name: "asc" }, include: withCount }),
  findById: (id: number) =>
    db.category.findUnique({ where: { id }, include: withCount }),
  findByName: (name: string, excludeId?: number | null) =>
    db.category.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    }),
  create: (name: string, tx: Tx = db) => tx.category.create({ data: { name } }),
  update: (id: number, name: string, tx: Tx = db) =>
    tx.category.update({ where: { id }, data: { name } }),
  delete: (id: number, tx: Tx = db) => tx.category.delete({ where: { id } }),
};
