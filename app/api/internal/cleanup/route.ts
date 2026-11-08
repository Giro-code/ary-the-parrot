import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { cleanupDatabase } from "../../../../src/db/cleanup";
import { constantEqual } from "../../../../src/server/crypto";
import { errorResponse, json } from "../../../../src/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || !constantEqual(request.headers.get("authorization") || "", `Bearer ${process.env.CRON_SECRET}`)) return json({ error: "unauthorized" }, 401);
  try { await cleanupDatabase((await getConnection()).db); return json({ cleaned: true }); } catch (error) { return errorResponse(error); }
}
