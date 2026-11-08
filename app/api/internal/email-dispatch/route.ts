import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { constantEqual } from "../../../../src/server/crypto";
import { dispatchEmails } from "../../../../src/server/email/outbox";
import { errorResponse, json } from "../../../../src/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !constantEqual(request.headers.get("authorization") || "", `Bearer ${secret}`)) return json({ error: "unauthorized" }, 401);
  try { return json(await dispatchEmails((await getConnection()).db)); } catch (error) { return errorResponse(error); }
}
export const POST = handle;
// Vercel Cron invokes GET. Same authentication and dispatcher as the required POST.
export const GET = handle;
