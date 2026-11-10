import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { handleWebhook, verifyWebhook } from "../../../../src/server/email/webhook";
import { errorResponse, json } from "../../../../src/server/http";
import { AppError } from "../../../../src/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_WEBHOOK_SECRET) throw new AppError("webhook_not_configured", 503);
    const reader = request.body?.getReader(); if (!reader) throw new AppError("invalid_body", 400);
    let size = 0; const parts: Uint8Array[] = [];
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 65536) { await reader.cancel(); throw new AppError("body_too_large", 413); } parts.push(part.value); }
    const raw = Buffer.concat(parts).toString("utf8");
    verifyWebhook(raw, request.headers);
    return json(await handleWebhook((await getConnection()).db, raw, request.headers));
  } catch (error) { return errorResponse(error); }
}
