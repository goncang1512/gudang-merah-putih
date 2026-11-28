import {
  activityLogRepository as logs,
  type LogFilter,
} from "../repositories/activityLog";
import { userRepository as users } from "../repositories/user";
import { PAGE_SIZE } from "../utils";

// ActivityLogService (SAD §7.2, §9.8). Pencatatan dilakukan tiap Service lewat ActivityLogRepository.create
// di dalam unit kerja yang sama dengan perubahan datanya; service ini menyajikan riwayat untuk Admin.
export async function list(f: LogFilter, page: number) {
  const [rows, total, userOptions, types] = await Promise.all([
    logs.list(f, (page - 1) * PAGE_SIZE, PAGE_SIZE),
    logs.count(f),
    users.listNames(),
    logs.types(),
  ]);
  return { rows, total, users: userOptions, types: types.map((t) => t.type) };
}
