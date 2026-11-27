import { db, type Tx } from "../db";
import type { Prisma, StatusPengajuan } from "../../generated/prisma/client";

// CorrectionRepository (SAD §7.3)
export type CorrectionFilter = {
  requestedById?: number;
  status?: StatusPengajuan;
};

const where = (f: CorrectionFilter): Prisma.CorrectionRequestWhereInput => ({
  ...(f.requestedById && { requestedById: f.requestedById }),
  ...(f.status && { status: f.status }),
});

export const correctionRepository = {
  list: (f: CorrectionFilter, skip: number, take: number) =>
    db.correctionRequest.findMany({
      where: where(f),
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      skip,
      take,
      include: {
        requestedBy: { select: { name: true } },
        decidedBy: { select: { name: true } },
        details: { include: { item: { select: { name: true } } } },
        transaction: {
          include: {
            details: {
              include: { item: { select: { name: true, unit: true } } },
            },
          },
        },
      },
    }),
  count: (f: CorrectionFilter) =>
    db.correctionRequest.count({ where: where(f) }),
  findById: (id: number, tx: Tx = db) =>
    tx.correctionRequest.findUnique({
      where: { id },
      include: { details: true, transaction: { select: { number: true } } },
    }),
  create: (data: Prisma.CorrectionRequestUncheckedCreateInput, tx: Tx = db) =>
    tx.correctionRequest.create({ data }),
  update: (
    id: number,
    data: Prisma.CorrectionRequestUncheckedUpdateInput,
    tx: Tx = db,
  ) => tx.correctionRequest.update({ where: { id }, data }),
  rejectPendingFor: (transactionId: number, adminId: number, tx: Tx) =>
    tx.correctionRequest.updateMany({
      where: { transactionId, status: "MENUNGGU" },
      data: { status: "DITOLAK", decidedById: adminId, decidedAt: new Date() },
    }),
};
