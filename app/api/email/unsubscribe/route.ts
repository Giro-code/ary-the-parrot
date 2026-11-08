import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { unsubscribeEmail } from "../../../../src/server/privacy";
import { errorResponse, json, tokenSchema } from "../../../../src/server/http";
import { AppError } from "../../../../src/server/errors";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const token = tokenSchema.safeParse(request.nextUrl.searchParams.get("token"));
    if (!token.success) throw new AppError("link_unavailable", 400);
    // RFC 8058: capability token + POST, no cookies/CSRF required; GET is non-mutating.
    return json(await unsubscribeEmail((await getConnection()).db, token.data));
  } catch (error) { return errorResponse(error); }
}
export function GET(request: NextRequest) {
  const token = tokenSchema.safeParse(request.nextUrl.searchParams.get("token"));
  if (!token.success) return json({ error: "link_unavailable" }, 400);
  return Response.redirect(new URL(`/email/baja?token=${token.data}`, request.url), 303);
}
