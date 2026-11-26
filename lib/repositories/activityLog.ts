import {db, type Tx} from '../db';
import type {Prisma} from '../../generated/prisma/client';

// ActivityLogRepository (SAD §7.3). Hanya create & read: riwayat tidak bisa diubah/dihapus (KF-LOG-03, dijaga trigger DB).
export type LogFilter = {userId?: number; type?: string; day?: Date};
export type LogEntry = {userId: number; type: string; detail: string; oldValue?: string; newValue?: string};

const where = (f: LogFilter): Prisma.ActivityLogWhereInput => ({
  ...(f.userId && {userId: f.userId}),
  ...(f.type && {type: f.type}),
  ...(f.day && {createdAt: {gte: f.day, lt: new Date(+f.day + 86_400_000)}}),
});

export const activityLogRepository = {
  create: (data: LogEntry, tx: Tx = db) => tx.activityLog.create({data}),
  list: (f: LogFilter, skip: number, take: number) =>
    db.activityLog.findMany({where: where(f), include: {user: {select: {name: true, role: true}}}, orderBy: {createdAt: 'desc'}, skip, take}),
  count: (f: LogFilter) => db.activityLog.count({where: where(f)}),
  types: () => db.activityLog.findMany({distinct: ['type'], select: {type: true}, orderBy: {type: 'asc'}}),
};
