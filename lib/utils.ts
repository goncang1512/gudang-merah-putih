export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const cn = (...v: (string | false | null | undefined)[]) =>
  v.filter(Boolean).join(" ");

// SRS §7: format DD-MM-YYYY, zona waktu WIB
const TZ = "Asia/Jakarta";
export const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // yyyy-mm-dd
export const tgl = (d: Date) => ymd(d).split("-").reverse().join("-");
export const waktu = (d: Date) =>
  `${tgl(d)} ${d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })}`;

export const reqCode = (id: number) => `REQ-${String(id).padStart(3, "0")}`;
export const roleLabel = {
  ADMIN: "Admin",
  PETUGAS_GUDANG: "Petugas Gudang",
} as const;
export const jenisLabel = {
  STOK_AWAL: "Stok Awal",
  MASUK: "Barang Masuk",
  KELUAR: "Barang Keluar",
} as const;
export const pengajuanLabel = {
  KOREKSI_JUMLAH: "Koreksi Jumlah",
  PEMBATALAN: "Pembatalan",
} as const;
export const statusBadge = (s: string) =>
  (
    ({
      AKTIF: "badge-green",
      DISETUJUI: "badge-green",
      MENUNGGU: "badge-yellow",
      DITOLAK: "badge-red",
      DIBATALKAN: "badge-gray",
      NONAKTIF: "badge-gray",
    }) as Record<string, string>
  )[s] ?? "badge-blue";
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export const PAGE_SIZE = 20; // KNF-07: daftar panjang ditampilkan per halaman
