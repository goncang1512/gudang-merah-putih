import { withTx } from "../db";
import { userRepository as users } from "../repositories/user";
import { activityLogRepository as logs } from "../repositories/activityLog";
import {
  assertPasswordRule,
  hashPassword,
  tempPassword,
  type SessionUser,
} from "./auth";
import { HttpError, UserError } from "../form";
import type { Role, Status } from "../../generated/prisma/client";

// UserService (SAD §7.2, §9.7). KF-USR-01..05: hanya Admin, tanpa registrasi mandiri.
export const list = () => users.list();

export async function create(
  me: SessionUser,
  u: { name: string; username: string; role: Role; password: string },
) {
  if (await users.findByUsername(u.username))
    throw new UserError("Username sudah dipakai."); // KF-USR-02
  assertPasswordRule(u.password);
  const passwordHash = await hashPassword(u.password);
  await withTx(async (tx) => {
    await users.create(
      { name: u.name, username: u.username, role: u.role, passwordHash },
      tx,
    );
    await logs.create(
      {
        userId: me.id,
        type: "Tambah Pengguna",
        detail: `${u.username} (${u.role})`,
      },
      tx,
    );
  });
}

export async function update(
  me: SessionUser,
  id: number,
  u: { name: string; role: Role; status: Status },
) {
  if (id === me.id && (u.role !== "ADMIN" || u.status !== "AKTIF"))
    throw new UserError(
      "Anda tidak bisa menurunkan peran atau menonaktifkan akun sendiri.",
    );
  const old = await users.findById(id);
  if (!old) throw new HttpError(404, "Pengguna tidak ditemukan.");
  await withTx(async (tx) => {
    await users.update(id, u, tx);
    await logs.create(
      {
        userId: me.id,
        type: "Ubah Pengguna",
        detail: old.username,
        oldValue: `${old.name}, ${old.role}, ${old.status}`,
        newValue: `${u.name}, ${u.role}, ${u.status}`,
      },
      tx,
    );
  });
}

// KF-USR-04/05: password sementara ditampilkan ke Admin, pengguna wajib ganti saat login
export async function resetPassword(me: SessionUser, id: number) {
  const user = await users.findById(id);
  if (!user) throw new HttpError(404, "Pengguna tidak ditemukan.");
  const temp = tempPassword();
  const passwordHash = await hashPassword(temp);
  await withTx(async (tx) => {
    await users.update(
      id,
      {
        passwordHash,
        mustChangePassword: true,
        failedLogins: 0,
        lockedUntil: null,
      },
      tx,
    );
    await logs.create(
      { userId: me.id, type: "Reset Password", detail: user.username },
      tx,
    );
  });
  return `Password sementara untuk ${user.username}: ${temp} — berikan ke pengguna. Pengguna wajib menggantinya saat login.`;
}
