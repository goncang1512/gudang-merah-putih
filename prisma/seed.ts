// Data awal (SRS §2.5 asumsi 3). Jalankan: pnpm db:seed. Aman dijalankan ulang (skip jika sudah ada user).
import {db} from '../lib/db';
import {hashPassword} from '../lib/services/auth';

async function main() {
  if (await db.user.count()) return console.log('Database sudah berisi data, seed dilewati.');

  const users = [
    {name: 'Andi Pratama', username: 'admin', role: 'ADMIN', password: process.env.ADMIN_PASSWORD ?? 'Admin12345'},
    {name: 'Budi Santoso', username: 'budi', role: 'PETUGAS_GUDANG', password: 'Petugas123'},
    {name: 'Citra Lestari', username: 'citra', role: 'PETUGAS_GUDANG', password: 'Petugas123'},
  ] as const;
  const ids: number[] = []; // berurutan agar admin = id 1
  for (const {password, ...u} of users) ids.push((await db.user.create({data: {...u, passwordHash: await hashPassword(password)}})).id);
  const admin = {id: ids[0]};

  console.log('Seed selesai.');
}

main().finally(() => db.$disconnect());
