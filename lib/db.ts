import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient, type Prisma} from '../generated/prisma/client';

// Data Access Layer (SAD §7.3): Prisma Client dipakai langsung sebagai repository.
const g = globalThis as unknown as {prisma?: PrismaClient};
export const db = g.prisma ?? new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL!})});
if (process.env.NODE_ENV !== 'production') g.prisma = db;

export type Tx = Prisma.TransactionClient;

// Activity Log (SRS KF-LOG-01/02, SAD §9.8)
export const logActivity = (tx: Tx, userId: number, type: string, detail: string, oldValue?: string, newValue?: string) =>
  tx.activityLog.create({data: {userId, type, detail, oldValue, newValue}});
