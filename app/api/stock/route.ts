import { route } from "../../../lib/api";
import * as stock from "../../../lib/services/stock";

// GET /api/stock: stok terkini barang aktif (SAD §8.4, §11.2)
export const GET = route({}, () => stock.current());
