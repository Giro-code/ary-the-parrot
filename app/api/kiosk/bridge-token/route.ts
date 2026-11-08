import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { errorResponse, json } from "../../../../src/server/http";
import { kioskDevice, rateLimit } from "../../../../src/server/service";
import { bridgeToken } from "../../../../src/server/robot";
import { hashToken } from "../../../../src/server/tokens";
import { AppError } from "../../../../src/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { db } = await getConnection();
    const device = await kioskDevice(db, request.cookies.get("ary_kiosk")?.value);
    if (!device) throw new AppError("kiosk_required", 403);
    await rateLimit(db, hashToken(`bridge-token:${device.id}`), 10);
    return json(bridgeToken(device.publicDeviceId));
  } catch (error) { return errorResponse(error); }
}
