import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import type { Database } from "../../db/client.ts";
import * as s from "../../db/schema.ts";
import { decrypt } from "../crypto.ts";
import { AppError } from "../errors.ts";
import { getSession, rateLimit } from "../service.ts";
import { hashToken } from "../tokens.ts";
import { numericEnv } from "../config.ts";
import { AiError, answerSchema, type AudioInput } from "./providers.ts";

export const defaultTtsModel = "gemini-3.8-flash-lite-tts", defaultTtsVoice = "Sulafat";
const spokenTextSchema = answerSchema.shape.spokenText;
export const speakInputSchema = z.object({ messageId: z.uuid() }).strict();
export const maxAudioBytes = 1024 * 1024;
export async function readAudio(request: NextRequest): Promise<AudioInput> {
  const mimeType = request.headers.get("content-type")?.split(";")[0].trim() || "";
  if (!["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"].includes(mimeType)) throw new AppError("unsupported_audio", 415);
  const duration = Number(request.headers.get("x-ary-audio-duration"));
  if (!Number.isFinite(duration) || duration < 100 || duration > 15000) throw new AppError("invalid_audio_duration", 400);
  if (Number(request.headers.get("content-length")) > maxAudioBytes) throw new AppError("body_too_large", 413);
  const reader = request.body?.getReader(); if (!reader) throw new AppError("invalid_body", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > maxAudioBytes) { await reader.cancel(); throw new AppError("body_too_large", 413); }
    chunks.push(part.value);
  }
  const bytes = Buffer.concat(chunks);
  const valid = mimeType === "audio/webm" ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) : mimeType === "audio/ogg" ? bytes.toString("ascii", 0, 4) === "OggS" : mimeType === "audio/mp4" ? bytes.toString("ascii", 4, 8) === "ftyp" : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE";
  if (size < 32 || !valid) throw new AppError("invalid_audio", 400);
  return { bytes, mimeType };
}
export function pcmToWav(pcm: Uint8Array, rate = 24000) {
  if (!pcm.byteLength || pcm.byteLength % 2 || pcm.byteLength > 3 * 1024 * 1024) throw new AiError("invalid_tts_audio");
  const header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(pcm.byteLength + 36, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.byteLength, 40);
  return Buffer.concat([header, pcm]);
}
export function validatedWav(bytes: Buffer) {
  if (bytes.length < 44 || bytes.length > 3 * 1024 * 1024 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new AiError("invalid_tts_wav");
  let format = false, data = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const tag = bytes.toString("ascii", offset, offset + 4), length = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + length > bytes.length) throw new AiError("invalid_tts_wav");
    if (tag === "fmt " && length >= 16) format = bytes.readUInt16LE(start) === 1 && bytes.readUInt16LE(start + 2) === 1 && bytes.readUInt32LE(start + 4) === 24000 && bytes.readUInt16LE(start + 14) === 16;
    if (tag === "data") data = length > 0 && length % 2 === 0;
    offset = start + length + (length % 2);
  }
  if (!format || !data) throw new AiError("invalid_tts_wav");
  return bytes;
}
export async function synthesize(text: string, inspectFormat?: (format: { mimeType: string; encodedBytes: number }) => void) {
  const model = process.env.AI_TTS_MODEL?.trim() || defaultTtsModel, voice = process.env.AI_TTS_VOICE?.trim() || defaultTtsVoice;
  if (!/^gemini-[a-z0-9.-]{1,70}-tts$/.test(model) || !/^[A-Za-z]{1,40}$/.test(voice)) throw new AiError("invalid_tts_config");
  const key = process.env.GEMINI_API_KEY?.trim(); if (!key) throw new AiError("missing_key");
  const style = "A friendly female parrot: warm, pleasant, expressive and lively, never shrill. Soft Dominican Caribbean accent in Spanish; warm, clear English. Read verbatim, without additional words or sound effects.";
  // 3.8 treats text as a verbatim transcript. Directions belong in metadata,
  // otherwise Ary can read the production notes aloud. Keep 2.5 configurable.
  const speech = model.startsWith("gemini-3.8-") ? { text, speechMetadata: { style } } : { text: `${style}\nRead only this transcript:\n${text}` };
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, signal: AbortSignal.timeout(10000), cache: "no-store",
      body: JSON.stringify({ contents: [{ parts: [speech] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
    });
  } catch { throw new AiError("tts_timeout_or_network"); }
  if (!response.ok) throw new AiError(`tts_http_${response.status}`);
  if (Number(response.headers.get("content-length")) > 5 * 1024 * 1024) throw new AiError("invalid_tts_audio");
  const raw = await response.json().catch(() => null);
  const part = raw?.candidates?.[0]?.content?.parts?.find((value: { inlineData?: { data?: string } }) => value.inlineData?.data)?.inlineData;
  if (typeof part?.data !== "string" || part.data.length > 4 * 1024 * 1024) throw new AiError("invalid_tts_audio");
  inspectFormat?.({ mimeType: String(part.mimeType || "").replace(/[^a-zA-Z0-9/;= ._-]/g, "").slice(0, 100), encodedBytes: part.data.length });
  if (!/^audio\/(L16|pcm|wav|x-wav)(?:;|$)/i.test(part.mimeType || "") || /rate=(?!24000\b)\d+|channels=(?!1\b)\d+/i.test(part.mimeType)) throw new AiError("unexpected_tts_format");
  const bytes = Buffer.from(part.data, "base64");
  const wav = /^audio\/(wav|x-wav)(?:;|$)/i.test(part.mimeType) || bytes.toString("ascii", 0, 4) === "RIFF" ? validatedWav(bytes) : pcmToWav(bytes);
  const metadata = raw?.usageMetadata;
  const count = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
  return { wav, model, inputTokens: count(metadata?.promptTokenCount), outputTokens: count(metadata?.candidatesTokenCount) };
}
// Bounded warm-instance cache, five minutes. Only synthesized speech; never visitor audio.
const cache = new Map<string, { wav: Buffer; until: number }>();
let cacheBytes = 0;
export async function speak(db: Database, token: string | undefined, raw: unknown) {
  const parsed = speakInputSchema.safeParse(raw); if (!parsed.success) throw new AppError("invalid_body", 400);
  const session = await getSession(db, token), started = Date.now();
  if (session.retentionClass === "kiosk_demo") throw new AppError("voice_unavailable", 503);
  const model = process.env.AI_TTS_MODEL?.trim() || defaultTtsModel, voice = process.env.AI_TTS_VOICE?.trim() || defaultTtsVoice;
  let text: string;
  try {
    await rateLimit(db, hashToken(`speak-session:${session.id}`), numericEnv("AI_TTS_SESSION_PER_MINUTE", 8, 20));
    await rateLimit(db, hashToken("speak-global"), numericEnv("AI_TTS_GLOBAL_PER_MINUTE", 30, 120));
    const [row] = await db.select().from(s.chatMessages).where(and(eq(s.chatMessages.id, parsed.data.messageId), eq(s.chatMessages.sessionId, session.id), eq(s.chatMessages.role, "assistant"), gt(s.chatMessages.retentionUntil, new Date())));
    // Only the server-written speech is needed. Validating the whole stored reply made
    // speech fail whenever an unrelated field (e.g. four follow-ups) was out of bounds.
    try { text = spokenTextSchema.parse(JSON.parse(decrypt(row.encryptedPayload!)).reply?.spokenText); }
    catch { throw new AppError("message_not_found", 404); }
  } catch (error) {
    // Record failures before synthesis too (no personal data), so the AI report shows them.
    await db.insert(s.aiUsage).values({ model, latencyMs: Date.now() - started, mode: "demo", errorCode: `tts_${error instanceof AppError ? error.code : "lookup_error"}` }).catch(() => undefined);
    throw error;
  }
  const key = createHash("sha256").update(JSON.stringify([text, voice, model])).digest("hex");
  for (const [id, entry] of cache) if (entry.until <= Date.now()) { cache.delete(id); cacheBytes -= entry.wav.length; }
  const hit = cache.get(key);
  if (hit) { await getSession(db, token); return hit.wav; }
  try {
    const result = await synthesize(text);
    await db.insert(s.aiUsage).values({ model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, latencyMs: Date.now() - started, mode: "gemini", errorCode: null });
    await getSession(db, token);
    while (cacheBytes + result.wav.length > 12 * 1024 * 1024 && cache.size) { const id = cache.keys().next().value!; cacheBytes -= cache.get(id)!.wav.length; cache.delete(id); }
    cache.set(key, { wav: result.wav, until: Date.now() + 300000 }); cacheBytes += result.wav.length;
    return result.wav;
  } catch (error) {
    if (error instanceof AppError) throw error;
    await db.insert(s.aiUsage).values({ model, latencyMs: Date.now() - started, mode: "demo", errorCode: error instanceof AiError ? error.code : "tts_error" });
    throw new AppError("voice_unavailable", 503);
  }
}
