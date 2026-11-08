import QRCode from "qrcode";
import { getConnection } from "../../../../src/db/client";
import { findItem } from "../../../../src/server/service";
import { baseUrl } from "../../../../src/server/config";
import { errorResponse, uuidSchema } from "../../../../src/server/http";
import { AppError } from "../../../../src/server/errors";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) throw new AppError("item_not_found", 404);
    const { db } = await getConnection(); await findItem(db, id);
    const svg = await QRCode.toString(`${baseUrl()}/cultura/${id}`, { type: "svg", width: 220, margin: 4 });
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  } catch (error) { return errorResponse(error); }
}
