import {randomBytes, randomInt, scrypt as _scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {cache} from 'react';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {db} from './db';
import {SESSION_COOKIE, verifySession} from './session';
import type {Role} from '../generated/prisma/client';

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

// KNF-08: password disimpan sebagai hash scrypt "salt:hash"
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

// KNF-09: minimal 8 karakter, berisi huruf dan angka
export function passwordError(password: string) {
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return 'Password minimal 8 karakter dan harus berisi huruf dan angka.';
  return null;
}

export function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = (s: string) => s[randomInt(s.length)];
  return Array.from({length: 7}, () => pick(chars)).join('') + pick('23456789') + pick('23456789');
}

export const getUser = cache(async () => {
  const id = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const user = await db.user.findUnique({where: {id}, select: {id: true, name: true, username: true, role: true, status: true, mustChangePassword: true}});
  return user?.status === 'AKTIF' ? user : null;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

// Authorization (SAD §4.3, KF-AUT-03, KNF-10): dipanggil di setiap halaman & server action.
export async function requireUser(role?: Role, {allowPasswordChange = false} = {}) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword && !allowPasswordChange) redirect('/ganti-password'); // KF-USR-05
  if (role && user.role !== role) redirect('/dashboard?akses=ditolak');
  return user;
}
