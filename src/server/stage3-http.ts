import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Database } from "../db/client.ts";
import { body, json, setCookie, tokenSchema } from "./http.ts";
import { clientHash } from "./tokens.ts";
import { verifyLink, confirmMarketing, requestMarketingConfirmation } from "./auth.ts";
import { getSession, rateLimit } from "./service.ts";
import { purposes, grantConsent, listConsents, revokeConsent } from "./consents.ts";
import { createInquiry, inquirySchema } from "./commercial.ts";
import { privacyData, deletePrivateData, setEmailPreferences } from "./privacy.ts";
import { AppError } from "./errors.ts";
import { isDryRun } from "./email/providers.ts";
import { dispatchImmediate } from "./email/outbox.ts";
import { startWithEmail, startRecovery, onboardingSchema } from "./onboarding.ts";
import { listConversations, openConversation, continueConversation, deleteConversation } from "./conversations.ts";
import { listPlaces, savePlace, deletePlace, placeSchema } from "./places.ts";
const empty = z.object({}).strict();
export async function stage3Http(request: NextRequest, db: Database) {
  const path = request.nextUrl.pathname, method = request.method, cookie = request.cookies.get("ary_sid")?.value;
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (path === "/api/trip-places") {
    const session = await getSession(db, cookie);
    if (method === "GET") return json({ places: await listPlaces(db, session) });
    if (method === "POST") return json(await savePlace(db, session, await body(request, placeSchema)), 201);
  }
  const placeMatch = path.match(/^\/api\/trip-places\/([\w-]+)$/);
  if (placeMatch && method === "DELETE") { const id = z.uuid().safeParse(placeMatch[1]); if (!id.success) throw new AppError("invalid_body", 400); await body(request, empty); return json(await deletePlace(db, await getSession(db, cookie), id.data)); }
  if (path === "/api/auth/start" && method === "POST") {
    const { token, ...result } = await startWithEmail(db, await body(request, onboardingSchema), clientHash(`welcome:${client}`), cookie);
    const response = json(result, 201); if (token) setCookie(response, "ary_sid", token); return response;
  }
  if (path === "/api/conversations" && method === "GET") return json({ conversations: await listConversations(db, await getSession(db, cookie)) });
  const conversationMatch = path.match(/^\/api\/conversations\/([\w-]+)(\/continue)?$/);
  if (conversationMatch) {
    const id = z.uuid().safeParse(conversationMatch[1]); if (!id.success) throw new AppError("invalid_body", 400);
    const session = await getSession(db, cookie);
    if (method === "GET" && !conversationMatch[2]) return json(await openConversation(db, session, id.data));
    if (method === "DELETE" && !conversationMatch[2]) { await body(request, empty); return json(await deleteConversation(db, session, id.data)); }
    if (method === "POST" && conversationMatch[2]) { await body(request, empty); return json(await continueConversation(db, session, id.data)); }
  }
  if (path === "/api/auth/request-link" && method === "POST") {
    const data = await body(request, z.object({ email: z.string().trim().max(254).pipe(z.email()), locale: z.enum(["es", "en"]), consentVersion: z.string().max(50), transactionalRecovery: z.literal(true), marketingEmail: z.boolean().default(false) }).strict());
    const { token, ...result } = await startRecovery(db, data, clientHash(`recovery-client:${client}`), cookie);
    const response = json(result); if (token) setCookie(response, "ary_sid", token); return response;
  }
  if (path === "/api/auth/verify-link" && method === "POST") {
    const { token } = await body(request, z.object({ token: tokenSchema }).strict());
    await rateLimit(db, clientHash(`verify-client:${client}`), 20, new Date(), 900_000);
    const result = await verifyLink(db, token, cookie), response = json({ verified: true, redirect: "/experiencia" });
    setCookie(response, "ary_sid", result.token); return response;
  }
  if (path === "/api/email/confirm" && method === "POST") {
    const { token } = await body(request, z.object({ token: tokenSchema }).strict());
    return json(await confirmMarketing(db, token));
  }
  if (path === "/api/commercial/inquiries" && method === "POST") {
    const data = await body(request, inquirySchema);
    return json(await createInquiry(db, data, request.headers.get("idempotency-key") || "", clientHash(`inquiry-client:${client}`)), 201);
  }
  if (!["/api/consents", "/api/privacy/export", "/api/privacy/delete", "/api/privacy/me", "/api/email/preferences"].includes(path) && !path.startsWith("/api/consents/")) return null;
  const session = await getSession(db, cookie);
  if (path === "/api/consents" && method === "GET") return json({ consents: await listConsents(db, session) });
  if (path === "/api/consents" && method === "POST") {
    const data = await body(request, z.object({ purpose: z.enum(purposes), locale: z.enum(["es", "en"]), noticeVersion: z.string().max(50) }).strict());
    let confirmationId: string | null = null;
    const consent = await db.transaction(async tx => {
      const row = await grantConsent(tx, session, data, "privacy_explicit");
      if (["marketing", "marketing_email"].includes(data.purpose)) confirmationId = await requestMarketingConfirmation(tx, session);
      return row;
    });
    await dispatchImmediate(db, [confirmationId]);
    return json({ consent, ...(["marketing", "marketing_email"].includes(data.purpose) ? { emailState: isDryRun() ? "dry_run" : "queued" } : {}) }, 201);
  }
  const match = path.match(/^\/api\/consents\/([^/]+)$/);
  if (match && method === "DELETE") {
    const purpose = z.enum(purposes).safeParse(match[1]); if (!purpose.success) throw new AppError("invalid_purpose", 400);
    await body(request, empty);
    await revokeConsent(db, session, purpose.data); return json({ revoked: true });
  }
  if (path === "/api/privacy/me" && method === "GET") return json(await privacyData(db, session));
  if (path === "/api/privacy/export" && method === "POST") {
    await body(request, empty); const response = json(await privacyData(db, session));
    response.headers.set("Content-Disposition", 'attachment; filename="ary-mis-datos.json"'); return response;
  }
  if (path === "/api/privacy/delete" && method === "POST") {
    await body(request, z.object({ confirm: z.literal(true) }).strict());
    const response = json(await deletePrivateData(db, session));
    response.cookies.set("ary_sid", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 }); return response;
  }
  if (path === "/api/email/preferences" && method === "POST") {
    const data = await body(request, z.object({ frequency: z.enum(["weekly", "monthly"]).optional(), status: z.enum(["paused", "unsubscribed", "active"]).optional() }).strict().refine(x => Object.keys(x).length > 0));
    return json(await setEmailPreferences(db, session, data));
  }
  return null;
}
