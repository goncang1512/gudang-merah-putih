import {revalidatePath} from 'next/cache';

// Validasi input di server (SAD §10.4, KNF-12). Pesan berbahasa Indonesia sederhana (SRS §5.1).
export type Result = {ok?: string; error?: string} | null;
export class UserError extends Error {}

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

// Bungkus server action: error bisnis -> pesan ke form; sukses -> segarkan semua halaman.
export async function run(fn: () => Promise<string | void>): Promise<Result> {
  try {
    const ok = await fn();
    revalidatePath('/', 'layout');
    return {ok: ok || 'Data berhasil disimpan.'};
  } catch (e) {
    if (e instanceof UserError) return {error: e.message};
    if ((e as {code?: string})?.code === 'P2002') return {error: 'Data yang sama sudah ada (nama/kode/username harus unik).'};
    throw e; // termasuk redirect() dari requireUser
  }
}
