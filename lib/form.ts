// Schema validation di API Layer (SAD §10.4, KNF-12). Pesan berbahasa Indonesia sederhana (SRS §5.1).
export type Result = {ok?: string; error?: string} | null;

// Error yang diteruskan ke client apa adanya beserta status HTTP-nya.
export class HttpError extends Error {
  constructor(public status: number, message: string, public redirect?: string) { super(message); }
}
// Input/aturan bisnis tidak valid -> 400 Bad Request (SAD §10.4 langkah 3)
export class UserError extends HttpError {
  constructor(message: string) { super(400, message); }
}

export function text(fd: FormData, key: string, label: string, {max = 255, optional = false} = {}) {
  const v = String(fd.get(key) ?? '').trim();
  if (!v && !optional) throw new UserError(`${label} wajib diisi.`);
  if (v.length > max) throw new UserError(`${label} maksimal ${max} karakter.`);
  return v;
}

export function int(fd: FormData | FormDataEntryValue | null, keyOrLabel: string, label?: string, {min = 0} = {}) {
  const raw = fd instanceof FormData ? fd.get(keyOrLabel) : fd;
  const name = label ?? keyOrLabel;
  const s = String(raw ?? '').trim();
  if (!/^-?\d+$/.test(s)) throw new UserError(`${name} harus berupa angka bulat.`);
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n > 2_000_000_000) throw new UserError(`${name} terlalu besar.`);
  if (n < min) throw new UserError(min === 1 ? `${name} harus lebih dari 0.` : `${name} tidak boleh kurang dari ${min}.`);
  return n;
}

export function oneOf<T extends string>(fd: FormData, key: string, label: string, values: readonly T[]): T {
  const v = String(fd.get(key) ?? '');
  if (!values.includes(v as T)) throw new UserError(`${label} tidak valid.`);
  return v as T;
}

export function date(fd: FormData, key: string, label: string) {
  const v = String(fd.get(key) ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) throw new UserError(`${label} tidak valid.`);
  return new Date(v); // UTC midnight -> kolom @db.Date
}

// Baris barang dari field berulang itemId[] + qty[] (form multi-barang)
export const lines = (fd: FormData) => {
  const ids = fd.getAll('itemId'), qtys = fd.getAll('qty');
  return ids.map((id, i) => ({itemId: int(id, 'Barang', 'Barang', {min: 1}), qty: int(qtys[i], 'Jumlah', 'Jumlah', {min: 1})}));
};

// Query string opsional (GET): angka/tanggal yang tidak valid diabaikan, bukan error.
export const optInt = (v: string | null) => Number(v) > 0 ? Number(v) : undefined;
export const optDate = (v: string | null) => v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v) : undefined;

// Body barang dipakai POST /api/items dan PATCH /api/items/:id
export const itemInput = (fd: FormData) => ({
  code: text(fd, 'code', 'Kode barang', {max: 20}).toUpperCase(),
  name: text(fd, 'name', 'Nama barang', {max: 100}),
  categoryId: int(fd, 'categoryId', 'Kategori', {min: 1}),
  unit: text(fd, 'unit', 'Satuan', {max: 20}),
  purchasePrice: int(fd, 'purchasePrice', 'Harga beli'),
  sellingPrice: int(fd, 'sellingPrice', 'Harga jual'),
  minStock: int(fd, 'minStock', 'Stok minimum'),
  status: oneOf(fd, 'status', 'Status', ['AKTIF', 'NONAKTIF'] as const),
});

// Header + detail transaksi masuk/keluar (SAD §4.4 Validate Header & Validate Detail)
export const transactionInput = (fd: FormData, partyLabel: string) => ({
  date: date(fd, 'date', 'Tanggal'),
  party: text(fd, 'party', partyLabel, {max: 100}),
  note: text(fd, 'note', 'Keterangan', {max: 500, optional: true}),
  lines: lines(fd),
});
