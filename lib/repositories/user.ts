import {db, type Tx} from '../db';
import type {Prisma} from '../../generated/prisma/client';

// UserRepository (SAD §7.3). passwordHash tidak pernah ikut keluar kecuali untuk verifikasi login.
const sessionSelect = {id: true, name: true, username: true, role: true, status: true, mustChangePassword: true} as const;
const safe = {passwordHash: true} as const;

export const userRepository = {
  findById: (id: number, tx: Tx = db) => tx.user.findUnique({where: {id}}),
  findByUsername: (username: string) => db.user.findUnique({where: {username}}),
  findSessionUser: (id: number) => db.user.findUnique({where: {id}, select: sessionSelect}),
  list: () => db.user.findMany({omit: safe, orderBy: [{status: 'asc'}, {name: 'asc'}]}),
  listNames: () => db.user.findMany({orderBy: {name: 'asc'}, select: {id: true, name: true}}),
  create: (data: Prisma.UserUncheckedCreateInput, tx: Tx = db) => tx.user.create({data, omit: safe}),
  update: (id: number, data: Prisma.UserUncheckedUpdateInput, tx: Tx = db) => tx.user.update({where: {id}, data, omit: safe}),
};
