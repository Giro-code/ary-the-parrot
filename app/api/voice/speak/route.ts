import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { body, csrf, errorResponse } from "../../../../src/server/http";
import { speak, speakInputSchema } from "../../../../src/server/ai/voice";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: NextRequest) {
  try {
    csrf(request);
    const input = await body(request, speakInputSchema), { db } = await getConnection();
    const wav = await speak(db, request.cookies.get("ary_sid")?.value, input);
    return new Response(new Uint8Array(wav), { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return errorResponse(error); }
}
