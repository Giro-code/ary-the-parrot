import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { jsonText, errorResponse, json } from "../../../../src/server/http";
import { acceptRobotEvent, authenticateRobot, robotEventSchema, robotSecret } from "../../../../src/server/robot";
import { AppError } from "../../../../src/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    robotSecret();
    const rawText = await jsonText(request);
    let parsed: unknown;
    try { parsed = JSON.parse(rawText); } catch { throw new AppError("invalid_body", 400); }
    const data = robotEventSchema.safeParse(parsed);
    if (!data.success) throw new AppError("invalid_body", 400);
    const { db } = await getConnection();
    const device = await authenticateRobot(db, request, rawText);
    return json(await acceptRobotEvent(db, device, data.data));
  } catch (error) { return errorResponse(error); }
}
