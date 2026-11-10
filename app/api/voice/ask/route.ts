import type { NextRequest } from "next/server";
import { getConnection } from "../../../../src/db/client";
import { csrf, errorResponse, json } from "../../../../src/server/http";
import { chat } from "../../../../src/server/ai/chat";
import { readAudio } from "../../../../src/server/ai/voice";
import { getSession } from "../../../../src/server/service";
import { consumeProvisionalQuestion } from "../../../../src/server/onboarding";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: NextRequest) {
  try {
    csrf(request);
    const { db } = await getConnection(), token = request.cookies.get("ary_sid")?.value;
    const session = await getSession(db, token);
    const audio = await readAudio(request);
    await consumeProvisionalQuestion(db, session);
    return json(await chat(db, token, undefined, audio));
  } catch (error) { return errorResponse(error); }
}
