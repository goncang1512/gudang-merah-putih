import {NextResponse, type NextRequest} from 'next/server';
import {SESSION_COOKIE, cookieOptions, signSession, verifySession} from './lib/session';

// Authentication middleware (SAD §7.4): semua halaman & API wajib login (KF-AUT-01).
// Role (Authorization) diperiksa di API Layer lewat route() di lib/api.ts.
const PUBLIC = ['/login', '/api/auth/login'];

export function proxy(req: NextRequest) {
  const {pathname} = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  const userId = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) {
    const res = pathname.startsWith('/api/')
      ? NextResponse.json({error: 'Sesi berakhir. Silakan login kembali.', redirect: '/login'}, {status: 401})
      : NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  const res = NextResponse.next();
  res.cookies.set(SESSION_COOKIE, signSession(userId), cookieOptions); // sliding idle timeout 30 menit (KF-AUT-05)
  return res;
}

export const config = {matcher: ['/((?!_next/|favicon.ico|.*\\..*).*)']};
