import {createHmac, timingSafeEqual} from 'node:crypto';

// Sesi = cookie bertanda tangan HMAC "userId.expiresAt.signature".
// Idle timeout 30 menit (SRS KF-AUT-05): proxy.ts memperpanjang expiresAt di setiap request.
export const SESSION_COOKIE = 'gm_session';
export const IDLE_MS = 30 * 60 * 1000;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET belum di-set (minimal 32 karakter) di .env');
  return s;
};
const hmac = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function signSession(userId: number) {
  const payload = `${userId}.${Date.now() + IDLE_MS}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifySession(token?: string): number | null {
  const [id, exp, sig] = token?.split('.') ?? [];
  if (!id || !exp || !sig) return null;
  const expected = Buffer.from(hmac(`${id}.${exp}`));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Number(exp) > Date.now() ? Number(id) : null;
}

export const cookieOptions = {httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: IDLE_MS / 1000} as const;
