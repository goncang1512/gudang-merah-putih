import { route } from "../../../lib/api";
import * as activity from "../../../lib/services/activityLog";
import { optInt } from "../../../lib/form";

// GET /api/activity-logs?user=&jenis=&tanggal=&page= (SAD §9.8), khusus Admin, read-only
export const GET = route({ role: "ADMIN" }, ({ query, page }) => {
  const tanggal = query.get("tanggal");
  return activity.list(
    {
      userId: optInt(query.get("user")),
      type: query.get("jenis") || undefined,
      day:
        tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal)
          ? new Date(`${tanggal}T00:00:00+07:00`)
          : undefined, // hari dalam WIB
    },
    page,
  );
});
