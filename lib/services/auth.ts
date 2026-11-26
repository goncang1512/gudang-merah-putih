import {randomBytes, randomInt, scrypt as _scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {withTx} from '../db';
import {userRepository as users} from '../repositories/user';
import {activityLogRepository as logs} from '../repositories/activityLog';
import {verifySession} from '../session';
import {HttpError, UserError} from '../form';

// AuthenticationService (SAD §7.2, §9.1)
const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

// KNF-08: password disimpan sebagai hash scrypt "salt:hash"
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(hash, 'hex'));
}

// KNF-09: minimal 8 karakter, berisi huruf dan angka
export function assertPasswordRule(password: string) {
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))
    throw new UserError('Password minimal 8 karakter dan harus berisi huruf dan angka.');
}

export function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = (s: string) => s[randomInt(s.length)];
  return Array.from({length: 7}, () => pick(chars)).join('') + pick('23456789') + pick('23456789');
}

// Authentication: token sesi -> pengguna aktif, atau null
export async function sessionUser(token?: string) {
  const id = verifySession(token);
  if (!id) return null;
  const user = await users.findSessionUser(id);
  return user?.status === 'AKTIF' ? user : null;
}
export type SessionUser = NonNullable<Awaited<ReturnType<typeof sessionUser>>>;

const LOCK_AFTER = 5, LOCK_MS = 5 * 60 * 1000; // KF-AUT-06
const WRONG = 'Username atau password salah.'; // SRS 3.1.2: tidak menyebut bagian yang salah

export async function login(username: string, password: string) {
  const user = username ? await users.findByUsername(username) : null;
  if (!user || user.status !== 'AKTIF') throw new HttpError(401, WRONG);
  if (user.lockedUntil && user.lockedUntil > new Date())
    throw new HttpError(423, `Akun dikunci sementara karena 5 kali salah password. Coba lagi dalam ${Math.ceil((+user.lockedUntil - Date.now()) / 60000)} menit.`);

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await users.update(user.id, failed >= LOCK_AFTER ? {failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS)} : {failedLogins: failed});
    throw failed >= LOCK_AFTER ? new HttpError(423, 'Akun dikunci selama 5 menit karena 5 kali salah password.') : new HttpError(401, WRONG);
  }

  await withTx(async tx => {
    await users.update(user.id, {failedLogins: 0, lockedUntil: null, lastLogin: new Date()}, tx);
    await logs.create({userId: user.id, type: 'Login', detail: `${user.name} masuk ke sistem`}, tx);
  });
  return {id: user.id, mustChangePassword: user.mustChangePassword};
}

export const logout = (me: SessionUser) => logs.create({userId: me.id, type: 'Logout', detail: `${me.name} keluar dari sistem`});

// KF-AUT-07 (ganti password sendiri) dan KF-USR-05 (wajib ganti setelah reset)
export async function changePassword(me: SessionUser, p: {oldPassword: string; newPassword: string; confirmPassword: string}) {
  const user = await users.findById(me.id);
  if (!user || !(await verifyPassword(p.oldPassword, user.passwordHash))) throw new UserError('Password lama salah.');
  assertPasswordRule(p.newPassword);
  if (p.newPassword !== p.confirmPassword) throw new UserError('Konfirmasi password tidak sama.');
  if (p.newPassword === p.oldPassword) throw new UserError('Password baru harus berbeda dari password lama.');
  const passwordHash = await hashPassword(p.newPassword);
  await withTx(async tx => {
    await users.update(me.id, {passwordHash, mustChangePassword: false}, tx);
    await logs.create({userId: me.id, type: 'Ganti Password', detail: `${me.name} mengganti password`}, tx);
  });
}

export async function updateProfile(me: SessionUser, name: string) {
  await withTx(async tx => {
    await users.update(me.id, {name}, tx);
    await logs.create({userId: me.id, type: 'Ubah Profil', detail: 'Mengubah nama akun', oldValue: me.name, newValue: name}, tx);
  });
}
