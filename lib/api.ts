import {NextResponse, type NextRequest} from 'next/server';
import {sessionUser, type SessionUser} from './services/auth';
import {SESSION_COOKIE} from './session';
import {HttpError} from './form';
import type {Role} from '../generated/prisma/client';

// API Layer (SAD §7.1, §7.4): setiap route handler di app/api/** dibungkus `route()`:
//   1. Authentication middleware  -> sesi valid & akun aktif, jika tidak 401
//   2. Authorization middleware   -> role sesuai resource, jika tidak 403 (ADR-004)
//   3. Parsing request (JSON atau form-data) -> Controller -> Service
//   4. Response formatting & error handling: {ok}/{error} JSON + status HTTP (400/401/403/404/409/500)
type Ctx = {req: NextRequest; me: SessionUser; params: Record<string, string>; body: FormData; query: URLSearchParams; page: number};
type Options = {role?: Role; isPublic?: boolean; allowPasswordChange?: boolean};

// Body JSON {a: 1, itemId: [1, 2]} diubah ke FormData agar validator lib/form.ts sama untuk JSON maupun form.
async function readBody(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) return req.formData().catch(() => new FormData());
  const fd = new FormData();
  for (const [k, v] of Object.entries((await req.json().catch(() => null)) ?? {})) for (const x of [v].flat()) fd.append(k, String(x));
  return fd;
}

export function route(opts: Options, controller: (c: Ctx) => Promise<unknown>) {
  return async (req: NextRequest, {params}: {params: Promise<Record<string, string>>}) => {
    try {
      const me = opts.isPublic ? null : await sessionUser(req.cookies.get(SESSION_COOKIE)?.value);
      if (!opts.isPublic) {
        if (!me) throw new HttpError(401, 'Sesi berakhir. Silakan login kembali.', '/login');
        if (me.mustChangePassword && !opts.allowPasswordChange) throw new HttpError(403, 'Ganti password sementara terlebih dahulu.', '/ganti-password'); // KF-USR-05
        if (opts.role && me.role !== opts.role) throw new HttpError(403, 'Akses ditolak: fitur ini khusus Admin.');
      }
      const query = req.nextUrl.searchParams;
      const body = req.method === 'GET' ? new FormData() : await readBody(req);
      const out = await controller({req, me: me!, params: await params, body, query, page: Math.max(1, Number(query.get('page')) || 1)});
      return NextResponse.json(typeof out === 'string' ? {ok: out} : out ?? {ok: 'Data berhasil disimpan.'});
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({error: e.message, redirect: e.redirect}, {status: e.status});
      if ((e as {code?: string})?.code === 'P2002') return NextResponse.json({error: 'Data yang sama sudah ada (nama/kode/username harus unik).'}, {status: 409});
      console.error(e);
      return NextResponse.json({error: 'Terjadi kesalahan pada server. Coba lagi.'}, {status: 500});
    }
  };
}

export const idParam = (params: Record<string, string>) => {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(404, 'Data tidak ditemukan.');
  return id;
};
