import { acceptedLanguages, phoneLocale, supportedLocale } from "../../../src/i18n";
import { NextRequest } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { getConnection } from "../../../src/db/client";
import * as service from "../../../src/server/service";
import { body, csrf, errorResponse, json, setCookie, tokenSchema, uuidSchema } from "../../../src/server/http";
import { clientHash } from "../../../src/server/tokens";
import { baseUrl } from "../../../src/server/config";
import { AppError } from "../../../src/server/errors";
import { interests } from "../../../src/i18n";
import { stage3Http } from "../../../src/server/stage3-http";
import { stage4bHttp } from "../../../src/server/stage4b-http";
import { chat, chatCue, chatHistory, chatInputSchema, cueSchema } from "../../../src/server/ai/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Includes one AI request (12 s timeout) and immediate transactional mail.
export const maxDuration = 180;
const prefs = z.object({ locale: z.enum(["es", "en"]), countryDeclared: z.string().regex(/^[A-Z]{2}$/).nullable(), interests: z.array(z.enum(interests)).max(6).transform(value => [...new Set(value)]) }).strict();
const empty = z.object({}).strict();
async function handle(request: NextRequest) {
  try {
    const method = request.method, path = request.nextUrl.pathname;
    if (method !== "GET") csrf(request);
    const { db } = await getConnection();
    if (method !== "GET") await service.rateLimit(db, clientHash(`mutate:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`), 90);
    const visitorToken = request.cookies.get("ary_sid")?.value;
    const deviceToken = request.cookies.get("ary_kiosk")?.value;
    const stage4b = await stage4bHttp(request, db); if (stage4b) return stage4b;
    const stage3 = await stage3Http(request, db); if (stage3) return stage3;
    if (path === "/api/kiosk/activate" && method === "POST") {
      const { code } = await body(request, z.object({ code: tokenSchema }).strict());
      const token = await service.activateKiosk(db, code);
      const response = json({ activated: true }); setCookie(response, "ary_kiosk", token); return response;
    }
    if (path === "/api/kiosk/me" && method === "GET") return json({ authorized: !!await service.kioskDevice(db, deviceToken) });
    if (path === "/api/chat" && method === "POST") return json(await chat(db, visitorToken, await body(request, chatInputSchema)));
    if (path === "/api/chat/cue" && method === "POST") return json(await chatCue(db, visitorToken, await body(request, cueSchema)));
    if (path === "/api/visitor/session" && method === "POST") {
      const { locale } = await body(request, z.object({ locale: z.enum(["es", "en"]).default("es") }).strict());
      let existing: service.Session | undefined;
      try { existing = await service.getSession(db, visitorToken); } catch (error) { if (!(error instanceof AppError)) throw error; }
      if (existing) return json({ session: service.publicSession(existing) });
      await service.rateLimit(db, clientHash(`session:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`), 20);
      const device = await service.kioskDevice(db, deviceToken);
      const created = await service.createSession(db, locale, device?.id);
      const response = json({ session: service.publicSession(created.session) }, 201); setCookie(response, "ary_sid", created.token); return response;
    }
    if (path === "/api/cultural/items" && method === "GET") {
      const query = z.object({ locale: z.enum(["es", "en"]).default("es"), offset: z.coerce.number().int().min(0).max(10000).default(0), limit: z.coerce.number().int().min(1).max(50).default(12) }).safeParse(Object.fromEntries(request.nextUrl.searchParams));
      if (!query.success) throw new AppError("invalid_query", 400);
      return json({ items: await service.listItems(db, query.data.locale, query.data.offset, query.data.limit) });
    }
    const itemMatch = path.match(/^\/api\/cultural\/items\/([^/]+)$/);
    if (itemMatch && method === "GET") {
      const parsed = uuidSchema.safeParse(itemMatch[1]); if (!parsed.success) throw new AppError("item_not_found", 404);
      return json({ item: await service.findItem(db, parsed.data) });
    }
    // Status can read the transferred source, but only from its authorized kiosk.
    if (path === "/api/visitor/handoff/status" && method === "GET") {
      const session = await service.getSession(db, visitorToken, new Date(), false);
      const device = await service.kioskDevice(db, deviceToken);
      if (!device || device.id !== session.kioskDeviceId) throw new AppError("kiosk_required", 403);
      return json(await service.handoffStatus(db, session.id));
    }
    if (path === "/api/visitor/handoff/redeem" && method === "POST") {
      const data = await body(request, z.object({ token: tokenSchema, confirmationCode: z.string().regex(/^\d{2}$/), browserLocale: z.enum(["en", "es"]).optional() }).strict());
      await service.rateLimit(db, clientHash(`redeem:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`), 15);
      const redeemed = await service.redeemHandoff(db, data.token, data.confirmationCode, undefined, supportedLocale(request.cookies.get("ary_lang")?.value) || data.browserLocale || phoneLocale(undefined, acceptedLanguages(request.headers.get("accept-language"))));
      const response = json({ session: service.publicSession(redeemed.session), redirect: "/experiencia" }); setCookie(response, "ary_sid", redeemed.token); response.cookies.set("ary_phone", redeemed.session.locale, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 86400 }); return response;
    }
    const session = await service.getSession(db, visitorToken);
    if (path === "/api/chat" && method === "GET") return json({ messages: await chatHistory(db, session) });
    if (path === "/api/visitor/me" && method === "GET") return json({ session: service.publicSession(session) });
    if (path === "/api/visitor/preferences" && method === "PATCH") {
      const data = await body(request, prefs); await service.setPreferences(db, session, data);
      return json({ session: { ...service.publicSession(session), ...data } });
    }
    if ((path === "/api/visitor/session/end" || path === "/api/visitor/handoff/cancel") && method === "POST") {
      await body(request, empty); await service.endSession(db, session.id);
      const response = json({ ended: true }); response.cookies.set("ary_sid", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 }); return response;
    }
    if (path === "/api/visitor/handoff" && method === "POST") {
      await body(request, empty);
      const device = await service.kioskDevice(db, deviceToken);
      if (!device) throw new AppError("kiosk_required", 403);
      await service.rateLimit(db, clientHash(`handoff:${device.id}`), 8);
      const base = baseUrl();
      const qr = await service.createHandoff(db, session, device.id);
      const url = `${base}/q/${qr.token}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 4, width: 280, errorCorrectionLevel: "M" });
      return json({ url, svg, confirmationCode: qr.confirmationCode, expiresAt: qr.expiresAt });
    }
    if (path === "/api/recommendations" && method === "POST") {
      await body(request, empty); return json(await service.recommend(db, session));
    }
    if (path === "/api/saved" && method === "GET") { const rows = await service.listSaved(db, session.id); const items = await service.localizeItems(db, rows.map(row => row.item), session.locale as "en" | "es"); return json({ items: rows.map((row, index) => ({ ...row, item: items[index] })) }); }
    if (path === "/api/saved" && method === "POST") {
      const data = await body(request, z.object({ itemId: uuidSchema }).strict()); return json({ saved: await service.saveItem(db, session.id, data.itemId) }, 201);
    }
    const savedMatch = path.match(/^\/api\/saved\/([^/]+)$/);
    if (savedMatch && method === "PATCH") {
      if (!uuidSchema.safeParse(savedMatch[1]).success) throw new AppError("saved_not_found", 404);
      const data = await body(request, z.object({ state: z.enum(["saved", "visited", "removed"]).optional(), favorite: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0));
      return json({ saved: await service.updateSaved(db, session.id, savedMatch[1], data) });
    }
    throw new AppError("not_found", 404);
  } catch (error) { return errorResponse(error); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
