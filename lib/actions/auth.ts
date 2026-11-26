'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {db, logActivity} from '../db';
import {getUser, hashPassword, passwordError, requireUser, verifyPassword} from '../auth';
import {SESSION_COOKIE, cookieOptions, signSession} from '../session';
import {run, text, UserError, type Result} from '../form';

const LOCK_AFTER = 5, LOCK_MS = 5 * 60 * 1000; // KF-AUT-06
const WRONG = 'Username atau password salah.'; // SRS 3.1.2: tidak menyebut bagian yang salah

export async function login(fd: FormData): Promise<Result> {
  const username = String(fd.get('username') ?? '').trim();
  const password = String(fd.get('password') ?? '');
  const user = username && await db.user.findUnique({where: {username}});
  if (!user || user.status !== 'AKTIF') return {error: WRONG};
  if (user.lockedUntil && user.lockedUntil > new Date())
    return {error: `Akun dikunci sementara karena 5 kali salah password. Coba lagi dalam ${Math.ceil((+user.lockedUntil - Date.now()) / 60000)} menit.`};

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await db.user.update({where: {id: user.id}, data: failed >= LOCK_AFTER ? {failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS)} : {failedLogins: failed}});
    return {error: failed >= LOCK_AFTER ? 'Akun dikunci selama 5 menit karena 5 kali salah password.' : WRONG};
  }

  await db.$transaction([
    db.user.update({where: {id: user.id}, data: {failedLogins: 0, lockedUntil: null, lastLogin: new Date()}}),
    logActivity(db, user.id, 'Login', `${user.name} masuk ke sistem`),
  ]);
  (await cookies()).set(SESSION_COOKIE, signSession(user.id), cookieOptions);
  redirect(user.mustChangePassword ? '/ganti-password' : '/dashboard');
}

export async function logout() {
  const user = await getUser();
  if (user) await logActivity(db, user.id, 'Logout', `${user.name} keluar dari sistem`);
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}

// KF-AUT-07 (ganti password sendiri) dan KF-USR-05 (wajib ganti setelah reset)
export async function changePassword(fd: FormData): Promise<Result> {
  const me = await requireUser(undefined, {allowPasswordChange: true});
  const result = await run(async () => {
    const user = await db.user.findUniqueOrThrow({where: {id: me.id}});
    const next = String(fd.get('newPassword') ?? '');
    if (!(await verifyPassword(String(fd.get('oldPassword') ?? ''), user.passwordHash))) throw new UserError('Password lama salah.');
    const err = passwordError(next);
    if (err) throw new UserError(err);
    if (next !== fd.get('confirmPassword')) throw new UserError('Konfirmasi password tidak sama.');
    if (next === fd.get('oldPassword')) throw new UserError('Password baru harus berbeda dari password lama.');
    const passwordHash = await hashPassword(next);
    await db.$transaction([
      db.user.update({where: {id: me.id}, data: {passwordHash, mustChangePassword: false}}),
      logActivity(db, me.id, 'Ganti Password', `${me.name} mengganti password`),
    ]);
    return 'Password berhasil diganti.';
  });
  if (result?.ok && me.mustChangePassword) redirect('/dashboard');
  return result;
}

export async function updateProfile(fd: FormData): Promise<Result> {
  const me = await requireUser();
  return run(async () => {
    const name = text(fd, 'name', 'Nama', {max: 100});
    await db.$transaction([
      db.user.update({where: {id: me.id}, data: {name}}),
      logActivity(db, me.id, 'Ubah Profil', 'Mengubah nama akun', me.name, name),
    ]);
    return 'Profil berhasil disimpan.';
  });
}
