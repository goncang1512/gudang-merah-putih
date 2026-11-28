import { idParam, route } from "../../../../lib/api";
import * as stock from "../../../../lib/services/stock";

// GET /api/stock/:itemId: kartu stok (KF-STK-03)
export const GET = route({}, ({ params }) => stock.card(idParam(params)));
