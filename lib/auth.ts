import {cache} from 'react';
import {redirect} from 'next/navigation';
import {fetchApi} from './http';
import type {SessionUser} from './services/auth';
import type {Role} from '../generated/prisma/client';

// Presentation Layer: identitas pengguna dari GET /api/auth/me.
// Redirect di sini hanya UX (SAD §6.3); otorisasi yang mengikat tetap di API Layer (lib/api.ts).
export const getUser = cache(async () => {
  const {res, body} = await fetchApi('/api/auth/me');
  return res.ok ? body as SessionUser : null;
});

export async function requireUser(role?: Role, {allowPasswordChange = false} = {}) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword && !allowPasswordChange) redirect('/ganti-password'); // KF-USR-05
  if (role && user.role !== role) redirect('/dashboard?akses=ditolak');
  return user;
}
