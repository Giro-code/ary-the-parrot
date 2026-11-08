import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { errorResponse, json } from "../../../../src/server/http";
import { authenticateRobot, nextMaintenanceCommand, robotSecret } from "../../../../src/server/robot";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    robotSecret();
    const { db } = await getConnection();
    const device = await authenticateRobot(db, request);
    return json({ command: await nextMaintenanceCommand(db, device.id) });
  } catch (error) { return errorResponse(error); }
}
