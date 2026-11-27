import { db, type Tx } from "../db";
import type {
  JenisTransaksi,
  Prisma,
  StatusTransaksi,
} from "../../generated/prisma/client";

// TransactionRepository (SAD §7.3). Tidak ada fungsi delete: transaksi tidak boleh dihapus (ADR-005).
export const detailInclude = {
  createdBy: { select: { name: true } },
  cancelledBy: { select: { name: true } },
  replaces: { select: { number: true } },
  replacedBy: { select: { number: true } },
  details: {
    include: {
      item: { select: { id: true, code: true, name: true, unit: true } },
    },
  },
  requests: {
    orderBy: { requestedAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      decidedBy: { select: { name: true } },
      details: true,
    },
  },
} satisfies Prisma.TransactionInclude;
export type TrxRow = Prisma.TransactionGetPayload<{
  include: typeof detailInclude;
}>;

export type TrxFilter = {
  type?: JenisTransaksi;
  from?: Date;
  to?: Date;
  itemId?: number;
  q?: string;
  status?: StatusTransaksi;
};

const where = (f: TrxFilter): Prisma.TransactionWhereInput => ({
  ...(f.type && { type: f.type }),
  ...((f.from || f.to) && {
    date: { ...(f.from && { gte: f.from }), ...(f.to && { lte: f.to }) },
  }),
  ...(f.itemId && { details: { some: { itemId: f.itemId } } }),
  ...(f.q && {
    OR: [
      { number: { contains: f.q, mode: "insensitive" } },
      { party: { contains: f.q, mode: "insensitive" } },
      { note: { contains: f.q, mode: "insensitive" } },
    ],
  }),
  ...(f.status && { status: f.status }),
});

export const transactionRepository = {
  list: (f: TrxFilter, skip: number, take: number) =>
    db.transaction.findMany({
      where: where(f),
      include: detailInclude,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  count: (f: TrxFilter) => db.transaction.count({ where: where(f) }),
  recent: (take: number, createdById?: number) =>
    db.transaction.findMany({
      where: createdById ? { createdById } : {},
      orderBy: { createdAt: "desc" },
      take,
    }),
  countByTypeOn: (date: Date) =>
    db.transaction.groupBy({
      by: ["type"],
      where: { date, status: "AKTIF" },
      _count: true,
    }),
  countPerDaySince: (from: Date) =>
    db.transaction.groupBy({
      by: ["date"],
      where: {
        date: { gte: from },
        status: "AKTIF",
        type: { not: "STOK_AWAL" },
      },
      _count: true,
    }),
  forReport: (
    type: JenisTransaksi,
    from: Date,
    to: Date,
    categoryId?: number,
  ) =>
    db.transaction.findMany({
      where: {
        type,
        status: "AKTIF",
        date: { gte: from, lte: to },
        ...(categoryId && { details: { some: { item: { categoryId } } } }),
      },
      include: {
        createdBy: { select: { name: true } },
        details: {
          include: {
            item: {
              select: { code: true, name: true, unit: true, categoryId: true },
            },
          },
        },
      },
      orderBy: [{ date: "asc" }, { number: "asc" }],
    }),
  findWithDetails: (id: number, tx: Tx = db) =>
    tx.transaction.findUnique({
      where: { id },
      include: { details: { include: { item: { select: { name: true } } } } },
    }),
  findWithPendingRequests: (id: number) =>
    db.transaction.findUnique({
      where: { id },
      include: { details: true, requests: { where: { status: "MENUNGGU" } } },
    }),
  // Penomoran diserialisasi per prefix agar dua transaksi bersamaan tidak mendapat nomor sama
  lockNumber: async (prefix: string, tx: Tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;
  },
  lastNumber: (prefix: string, tx: Tx) =>
    tx.transaction.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: "desc" },
      select: { number: true },
    }),
  create: (data: Prisma.TransactionUncheckedCreateInput, tx: Tx) =>
    tx.transaction.create({ data }),
  update: (id: number, data: Prisma.TransactionUncheckedUpdateInput, tx: Tx) =>
    tx.transaction.update({ where: { id }, data }),
};
