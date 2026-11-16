# Website Manajemen Gudang Merah Putih

Implementasi SRS v1.0 dan SAD v1.0: Next.js (App Router) + Prisma 7 + PostgreSQL.

## Menjalankan

```bash
pnpm install                 # juga menjalankan prisma generate
cp .env.example .env         # isi DATABASE_URL dan SESSION_SECRET
pnpm db:migrate              # buat database + tabel (prisma migrate dev)
pnpm db:seed                 # data awal: kategori, barang, stok awal, akun
pnpm db:check                # opsional: uji aturan stok (di-rollback)
pnpm dev
```

Akun seed: `admin` / `Admin12345` (Admin), `budi` / `Petugas123` dan `citra` / `Petugas123` (Petugas Gudang). Ganti password setelah login pertama.

Produksi: `pnpm db:deploy && pnpm build && pnpm start` di belakang HTTPS (cookie sesi otomatis `secure` di production).

## Arsitektur (SAD §4.2)

| Layer SAD | Implementasi |
|---|---|
| Presentation | `app/*/page.tsx` (Server Components) + `components/` |
| API Layer | Server Actions `lib/actions/*` (auth, validasi, pesan error), `proxy.ts` (authentication middleware) |
| Business Logic | `lib/stock.ts` (StockService, transaksi, pembatalan, koreksi), `lib/auth.ts` |
| Data Access | Prisma Client `lib/db.ts` |
| Database | PostgreSQL, skema `prisma/schema.prisma`, migration `prisma/migrations` |

Endpoint REST konseptual di SAD §11.2 diwujudkan sebagai Server Actions, satu aksi per endpoint (mis. `saveTransaction` = POST /transactions/inbound|outbound, `decideRequest` = PATCH /corrections/:id).

## Aturan SRS yang dijaga

- **Stok dihitung, bukan disimpan**: stok awal + masuk − keluar dari transaksi berstatus AKTIF (KF-STK-01).
- Barang keluar melebihi stok ditolak di form dan di server, dengan row lock agar aman untuk transaksi bersamaan (KF-BK-03).
- Nomor transaksi `SA-/BM-/BK-YYYYMMDD-NNN` (KF-BM-04, KF-BK-05).
- Transaksi tidak bisa dihapus (trigger database). Koreksi yang disetujui membatalkan transaksi lama dan membuat transaksi pengganti (SAD §9.6). Pembatalan barang masuk yang membuat stok minus ditolak (KF-KOR-06).
- Riwayat aktivitas tidak bisa diubah atau dihapus (trigger database), mencatat nilai lama/baru (KF-LOG-01..03).
- Login: hash scrypt, pesan error generik, kunci 5 menit setelah 5 kali salah, sesi habis setelah 30 menit tanpa aktivitas, wajib ganti password setelah reset (KF-AUT, KF-USR, KNF-08/09).
- Otorisasi per peran diperiksa di server pada setiap halaman dan aksi (KNF-10).
- Tanggal DD-MM-YYYY, zona waktu WIB, format Rupiah (SRS §7).

Backup harian (KNF-14) diatur di layanan hosting database, di luar kode aplikasi.
