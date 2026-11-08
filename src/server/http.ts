import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "./errors.ts";
import { baseUrl, sessionTtl } from "./config.ts";
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const uuidSchema = z.uuid();
export function csrf(request: NextRequest) {
  if (request.headers.get("x-ary-request") !== "1") throw new AppError("csrf_rejected", 403);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || request.nextUrl.host;
  if (!origin) throw new AppError("csrf_rejected", 403);
  // Resolve config first: a misconfigured APP_BASE_URL is a 503 server problem, not a CSRF rejection.
  const configured = baseUrl();
  try {
    const url = new URL(origin), expected = new URL(configured);
    const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.origin !== origin || url.host !== host || !(url.origin === expected.origin || local)) throw new Error();
  } catch { throw new AppError("csrf_rejected", 403); }
}
export async function body<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError("invalid_body", 400);
  // Enforce the cap on actual streamed bytes too (Content-Length is not trusted).
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("invalid_body", 400);
  let size = 0, content = "";
  const decoder = new TextDecoder();
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new AppError("body_too_large", 413); }
    content += decoder.decode(part.value, { stream: true });
  }
  content += decoder.decode();
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new AppError("invalid_body", 400); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new AppError("invalid_body", 400);
  return result.data;
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
}
export function setCookie(response: NextResponse, name: "ary_sid" | "ary_kiosk", value: string) {
  response.cookies.set(name, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: name === "ary_sid" ? Math.floor(sessionTtl() / 1000) : 30 * 86400 });
}
export function errorResponse(error: unknown, requestId = randomUUID()) {
  const known = error instanceof AppError;
  return json({ error: known ? error.code : "service_unavailable", message: known ? error.code : "Service temporarily unavailable", requestId }, known ? error.status : 503);
}
