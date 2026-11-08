import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db/client.ts";
import * as s from "../../db/schema.ts";
import { getSession, recordEvent, rateLimit, type CulturalItem, type Session } from "../service.ts";
import { encrypt, decrypt } from "../crypto.ts";
import { hashToken } from "../tokens.ts";
import { numericEnv } from "../config.ts";
import { AppError } from "../errors.ts";
import { AiError, DemoAiProvider, GeminiProvider, defaultModel, answerSchema, type AiInput, type Answer } from "./providers.ts";
import type { Locale } from "../../i18n/index.ts";

export const chatInputSchema = z.object({ message: z.string().trim().min(1).max(500) }).strict();
const normalized = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
const injection = /ignor[ae].{0,35}(instrucciones|instructions|rules)|system\s*prompt|developer\s*message|reveal.{0,20}(secret|key)|api[_ -]?key|actua como|override.{0,20}(rules|instructions)|<\/?(system|script)|BEGIN_UNTRUSTED|END_UNTRUSTED/i;
export function classifyIntent(message: string) {
  const text = normalized(message);
  if (/\b(vuelos?|flight\w*|puertas?|gates?|boarding|embarque|migracion|inmigracion|immigration|aduanas?|customs|seguridad|security|emergencia\w*|emergency|salud|health|medical|medic\w*|hospital\w*|ley|leyes|legal|laws?|visa\w*|pasaport\w*|passport\w*|policia|police|dolor|pain|alerg\w*|allerg\w*)\b/.test(text)) return "sensitive";
  if (injection.test(text)) return "injection";
  if (/\b(horarios?|precios?|prices?|costs?|opening|requirements?|requisitos?|tickets?)\b/.test(text)) return "unverified";
  return "culture";
}
function safeSource(item: CulturalItem) {
  try { return !!item.sourceUrl && new URL(item.sourceUrl).protocol === "https:"; } catch { return false; }
}
async function retrieve(db: Database, session: Session, message: string) {
  const rows = await db.select().from(s.culturalItems).where(and(eq(s.culturalItems.status, "published"), eq(s.culturalItems.language, session.locale))).limit(100);
  const words = normalized(message).split(/\W+/).filter(word => word.length >= 4);
  return rows.filter(item => safeSource(item) && !injection.test([item.title, item.summary, item.validatedDescription].join(" "))).map(item => {
    const text = normalized(`${item.title} ${item.summary} ${item.tags.join(" ")}`);
    return { item, score: words.reduce((score, word) => score + (text.includes(word) ? 3 : 0), 0) + item.tags.filter(tag => session.interests.includes(tag)).length };
  }).sort((a, b) => b.score - a.score || a.item.contentKey.localeCompare(b.item.contentKey)).slice(0, 6).map(row => ({ ...row.item, validatedDescription: row.item.validatedDescription.slice(0, 1800) }));
}
export type ChatMode = "gemini" | "demo";
export type ChatReply = Answer & { mode: ChatMode; sources: { id: string; title: string; url: string; editor: string }[]; handoff: boolean };
const historyPayloadSchema = z.object({ text: z.string().max(1200), reply: answerSchema.extend({
  mode: z.enum(["gemini", "demo"]), handoff: z.boolean(), sources: z.array(z.object({ id: z.uuid(), title: z.string(), url: z.url().refine(value => value.startsWith("https://")), editor: z.string() })).max(6),
}).optional() });
export async function chatHistory(db: Database, session: Session) {
  const rows = await db.select().from(s.chatMessages).where(and(eq(s.chatMessages.sessionId, session.id), gt(s.chatMessages.retentionUntil, new Date()))).orderBy(desc(s.chatMessages.createdAt), desc(s.chatMessages.id)).limit(40);
  return rows.reverse().flatMap(row => {
    if (!row.encryptedPayload || !["user", "assistant"].includes(row.role)) return [];
    try {
      const payload = historyPayloadSchema.safeParse(JSON.parse(decrypt(row.encryptedPayload)));
      return payload.success ? [{ id: row.id, role: row.role as "user" | "assistant", ...payload.data }] : [];
    } catch { return []; }
  });
}
export async function chat(db: Database, token: string | undefined, raw: unknown) {
  const parsed = chatInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("invalid_body", 400);
  const session = await getSession(db, token), message = parsed.data.message, now = new Date();
  await rateLimit(db, hashToken(`chat-total:${session.id}`), 20, now, +session.expiresAt - +now);
  await rateLimit(db, hashToken(`chat-minute:${session.id}`), numericEnv("AI_SESSION_PER_MINUTE", 6, 20), now);
  await rateLimit(db, hashToken("chat-global-minute"), numericEnv("AI_GLOBAL_PER_MINUTE", 30, 120), now);
  await recordEvent(db, "chat_asked", {}, session);
  const intent = classifyIntent(message), locale = session.locale as Locale;
  const started = Date.now();
  let mode: ChatMode = "demo", model = "template", inputTokens = 0, outputTokens = 0, errorCode: string | null = null;
  let answer: Answer, items: CulturalItem[] = [];
  if (intent !== "culture") {
    answer = { answer: intent === "sensitive" ? locale === "es" ? "Para vuelos, puertas, migración, aduanas, seguridad, emergencias, salud o leyes, consulta al personal del aeropuerto o el sitio oficial de la autoridad correspondiente. Ary solo ofrece orientación cultural." : "For flights, gates, immigration, customs, security, emergencies, health or laws, ask airport staff or the relevant authority's official website. Ary only offers cultural guidance." : locale === "es" ? "No tengo una fuente verificada para eso. Puedo contarte sobre las fichas culturales publicadas." : "I do not have a verified source for that. I can tell you about the published cultural items.", citedItemIds: [], followUps: [], confidence: 0 };
  } else {
    items = await retrieve(db, session, message);
    const history = (await chatHistory(db, session)).filter(row => classifyIntent(row.text) === "culture").slice(-4).map(row => ({ role: row.role, text: row.text.slice(0, 1200) }));
    const input: AiInput = { message, locale, items, history };
    const demo = new DemoAiProvider();
    if (process.env.GEMINI_API_KEY?.trim() && items.length) {
      model = defaultModel;
      try {
        const provider = new GeminiProvider(); model = provider.model;
        const generated = await provider.generate(input);
        answer = generated.answer; ({ inputTokens, outputTokens } = generated.usage); mode = "gemini";
      } catch (error) {
        errorCode = error instanceof AiError ? error.code : "provider_error";
        if (error instanceof AiError) ({ inputTokens, outputTokens } = error.usage);
        answer = (await demo.generate(input)).answer;
      }
    } else { model = "demo"; answer = (await demo.generate(input)).answer; }
  }
  const reply: ChatReply = { ...answer, mode, handoff: intent === "sensitive", sources: items.filter(item => answer.citedItemIds.includes(item.id)).map(item => ({ id: item.id, title: item.title, url: item.sourceUrl!, editor: item.editor })) };
  // Re-lock after the network wait. End/QR transfer wins and cannot be resurrected by a late answer.
  await db.transaction(async tx => {
    await tx.insert(s.aiUsage).values({ model, inputTokens, outputTokens, latencyMs: Date.now() - started, errorCode, mode });
    const [active] = await tx.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, new Date()))).for("update");
    if (!active) return;
    await tx.insert(s.chatMessages).values([
      { sessionId: active.id, role: "user", encryptedPayload: encrypt(JSON.stringify({ text: message })), retentionUntil: active.expiresAt, createdAt: new Date() },
      { sessionId: active.id, role: "assistant", encryptedPayload: encrypt(JSON.stringify({ text: reply.answer, reply })), provenance: { mode, citedItemIds: reply.citedItemIds }, retentionUntil: active.expiresAt, createdAt: new Date(Date.now() + 1) },
    ]);
  });
  // A consumed/ended session must not receive its late response, even to the old browser.
  await getSession(db, token);
  return reply;
}
