import {headers} from 'next/headers';
import {notFound, redirect} from 'next/navigation';

// Presentation Layer -> API Layer lewat HTTP (SAD §5.2, §11.1). Dipakai Server Component untuk GET;
// form di browser memanggil API langsung lewat fetch (components/Form.tsx).

// JSON tidak punya tipe Date: string ISO dari API dikembalikan menjadi Date.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const reviveDates = (_: string, v: unknown) => typeof v === 'string' && ISO.test(v) ? new Date(v) : v;

// Tipe respons = tipe hasil Service di balik endpoint tersebut.
export type Api<F extends (...args: never[]) => unknown> = Awaited<ReturnType<F>>;

// Cookie sesi browser diteruskan agar API mengenali pengguna yang sama.
// ponytail: request kembali ke host publik; set URL internal jika deploy di belakang load balancer yang lambat
export async function fetchApi(path: string) {
  const h = await headers();
  const res = await fetch(`${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}${path}`, {headers: {cookie: h.get('cookie') ?? ''}, cache: 'no-store'});
  return {res, body: JSON.parse(await res.text(), reviveDates)};
}

export async function apiGet<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
  const {res, body} = await fetchApi(qs ? `${path}?${qs}` : path);
  if (res.ok) return body;
  if (res.status === 404) notFound();
  if (res.status === 401 || res.status === 403) redirect(body?.redirect ?? '/dashboard?akses=ditolak');
  throw new Error(body?.error ?? `GET ${path} gagal (${res.status})`);
}
