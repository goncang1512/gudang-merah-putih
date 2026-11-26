import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient, type Prisma} from '../generated/prisma/client';

// Koneksi database (SAD §11.1). Hanya lib/repositories/* yang boleh memakai `db` (SAD §7.3).
const g = globalThis as unknown as {prisma?: PrismaClient};
export const db = g.prisma ?? new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL!})});
if (process.env.NODE_ENV !== 'production') g.prisma = db;

export type Tx = Prisma.TransactionClient;

// Unit of work (SAD §4.4): Service menjalankan beberapa Repository dalam satu transaksi database,
// semua berhasil (commit) atau semua batal (rollback).
export const withTx = <T>(fn: (tx: Tx) => Promise<T>) => db.$transaction(fn);
