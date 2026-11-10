import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db/client.ts";
import * as s from "../../db/schema.ts";
import { getSession, setPreferences, localizeItems, recordEvent, rateLimit, type CulturalItem, type Session } from "../service.ts";
import { encrypt, decrypt } from "../crypto.ts";
import { hashToken } from "../tokens.ts";
import { numericEnv } from "../config.ts";
import { AppError } from "../errors.ts";
import { AiError, DemoAiProvider, GeminiProvider, defaultModel, answerSchema, type AiInput, type Answer, type AudioInput } from "./providers.ts";
import { classifyIntent, injection, spokenText } from "./safety.ts";
import { conversationPreferences, normalize, type ConversationPreferences } from "../../conversation.ts";
import { detectedLocale, textLanguage } from "../../i18n/language.ts";
import type { Locale } from "../../i18n/index.ts";
export { classifyIntent } from "./safety.ts";

export const chatInputSchema = z.object({ message: z.string().trim().min(1).max(500) }).strict();
export const cueSchema = z.object({ cue: z.enum(["welcome", "interests", "idle"]) }).strict();
export type ChatMode = "gemini" | "demo";
export type ChatReply = Answer & { answer: string; messageId: string; transcript?: string; preferences?: ConversationPreferences; mode: ChatMode; sources: { id: string; title: string; summary: string; url: string; editor: string }[]; handoff: boolean };
const sourceSchema = z.object({ id: z.uuid(), title: z.string(), summary: z.string().default(""), url: z.url().refine(value => value.startsWith("https://")), editor: z.string() });
export const replySchema = answerSchema.extend({ answer: z.string(), messageId: z.uuid(), mode: z.enum(["gemini", "demo"]), handoff: z.boolean(), sources: z.array(sourceSchema).max(6) });
const historyPayloadSchema = z.object({ text: z.string().max(1200), reply: replySchema.optional() });
export async function chatHistory(db: Database, session: Session) {
  const rows = await db.select().from(s.chatMessages).where(and(eq(s.chatMessages.sessionId, session.id), gt(s.chatMessages.retentionUntil, new Date()))).orderBy(desc(s.chatMessages.createdAt), desc(s.chatMessages.id)).limit(40);
  return rows.reverse().flatMap(row => {
    if (!row.encryptedPayload || !["user", "assistant"].includes(row.role)) return [];
    try {
      const raw = JSON.parse(decrypt(row.encryptedPayload));
      // Read encrypted stage4A history without a DB migration; do not invent new sources.
      if (raw.reply && !raw.reply.displayText) raw.reply = { ...raw.reply, displayText: raw.reply.answer, spokenText: raw.reply.answer, detectedLanguage: session.locale, intent: "culture", messageId: row.id };
      if (raw.reply && !raw.reply.detectedLanguage) raw.reply.detectedLanguage = session.locale;
      const payload = historyPayloadSchema.safeParse(raw);
      return payload.success ? [{ id: row.id, role: row.role as "user" | "assistant", ...payload.data }] : [];
    } catch { return []; }
  });
}
async function retrieve(db: Database, session: Session, message: string, audio = false) {
  const rows = await db.select().from(s.culturalItems).where(and(eq(s.culturalItems.status, "published"), eq(s.culturalItems.language, session.locale))).limit(100);
  const words = normalize(message).split(/\W+/).filter(word => word.length >= 4);
  return rows.filter(item => { try { return item.sourceUrl && new URL(item.sourceUrl).protocol === "https:" && !injection.test([item.title, item.summary, item.validatedDescription].join(" ")); } catch { return false; } }).map(item => {
    const text = normalize(`${item.title} ${item.summary} ${item.tags.join(" ")}`);
    return { item, score: words.reduce((score, word) => score + (text.includes(word) ? 3 : 0), 0) + item.tags.filter(tag => session.interests.includes(tag)).length };
  }).sort((a, b) => b.score - a.score || a.item.contentKey.localeCompare(b.item.contentKey)).slice(0, audio ? 12 : 6).map(row => ({ ...row.item, validatedDescription: row.item.validatedDescription.slice(0, audio ? 1000 : 1800) }));
}
function fixedAnswer(text: string, intent: Answer["intent"] = "preferences"): Answer { return { detectedLanguage: "en", displayText: text, spokenText: text, intent, citedItemIds: [], followUps: [], confidence: 0 }; }
function conversationalAnswer(message: string, locale: Locale) {
  if (/^(hola[!,. ]*|hello[!,. ]*|hi[!,. ]*|espanol[.! ]*|english[.! ]*|soy de .+|vengo de .+|visito desde .+|i am from .+|i'm from .+|prefiero no decirlo[.! ]*|prefer not to say[.! ]*)$/.test(normalize(message))) return fixedAnswer(locale === "es" ? "¡Qué gusto conversar contigo! ¿Qué te gustaría descubrir? Música, comida, playas, historia…" : "Lovely to chat with you! What would you like to discover? Music, food, beaches, history…");
  return null;
}
function redirect(locale: Locale, intent: ReturnType<typeof classifyIntent>) {
  return fixedAnswer(intent === "sensitive" ? locale === "es" ? "Para vuelos, puertas, migración, aduanas, seguridad, emergencias, salud o leyes, consulta al personal del aeropuerto o la autoridad oficial. Para tus datos, abre Privacidad. Yo te acompaño con la cultura." : "For flights, gates, immigration, customs, security, emergencies, health or laws, ask airport staff or the official authority. For your data, open Privacy. I can help with culture." : locale === "es" ? "No tengo una fuente verificada para eso. ¿Descubrimos las fichas culturales?" : "I don't have a verified source for that. Shall we explore the cultural cards?", intent);
}
async function persistReply(db: Database, token: string | undefined, session: Session, message: string | null, answer: Answer, items: CulturalItem[], mode: ChatMode, transcript?: string, greeting = false): Promise<ChatReply> {
  items = await localizeItems(db, items, detectedLocale(answer.detectedLanguage));
  const messageId = crypto.randomUUID();
  const sensitive = answer.intent !== "culture" && answer.intent !== "preferences";
  const reply: ChatReply = { ...answer, spokenText: spokenText(answer.displayText, answer.spokenText, sensitive, greeting), answer: answer.displayText, messageId, mode, handoff: answer.intent === "sensitive", sources: items.filter(item => answer.citedItemIds.includes(item.id)).map(item => ({ id: item.id, title: item.title, summary: item.summary.slice(0, 180), url: item.sourceUrl!, editor: item.editor })) };
  const preferences = message ? { ...conversationPreferences(message, { locale: session.locale as Locale, countryDeclared: session.countryDeclared, interests: session.interests as ConversationPreferences["interests"] }), locale: detectedLocale(answer.detectedLanguage) } : undefined;
  if (preferences) await setPreferences(db, session, preferences);
  await db.transaction(async tx => {
    const [active] = await tx.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, new Date()))).for("update");
    if (!active) return;
    if (message) await tx.insert(s.chatMessages).values({ sessionId: active.id, role: "user", encryptedPayload: encrypt(JSON.stringify({ text: message })), retentionUntil: active.expiresAt, createdAt: new Date() });
    await tx.insert(s.chatMessages).values({ id: messageId, sessionId: active.id, role: "assistant", encryptedPayload: encrypt(JSON.stringify({ text: reply.displayText, reply })), provenance: { mode, citedItemIds: reply.citedItemIds }, retentionUntil: active.expiresAt, createdAt: new Date(Date.now() + 1) });
  });
  await getSession(db, token);
  return { ...reply, ...(preferences ? { preferences } : {}), ...(transcript ? { transcript } : {}) };
}
export async function chatCue(db: Database, token: string | undefined, raw: unknown) {
  const parsed = cueSchema.safeParse(raw); if (!parsed.success) throw new AppError("invalid_body", 400);
  const session = await getSession(db, token), en = session.locale === "en";
  await rateLimit(db, hashToken(`chat-cue:${session.id}`), 8);
  const text = parsed.data.cue === "welcome" ? en ? "Hi! I'm Ary, the Dominican parrot. Ask me anything… ¿o prefieres español?" : "¡Hola, hola! Soy Ary, la cotorra de República Dominicana. ¿Hablamos en español o en inglés?" : parsed.data.cue === "idle" ? en ? "Still there? Tap to stay a little longer." : "¿Sigues ahí? Toca para quedarte un poquito más." : en ? "What would you love to discover? Music, food, beaches, history… You choose!" : "¿Qué te gustaría descubrir? Música, comida, playas, historia… ¡Tú eliges!";
  const answer = { ...fixedAnswer(text), detectedLanguage: session.locale as Locale };
  return persistReply(db, token, session, null, answer, [], "demo", undefined, parsed.data.cue === "welcome");
}
export async function chat(db: Database, token: string | undefined, raw: unknown, audio?: AudioInput) {
  const parsed = audio ? null : chatInputSchema.safeParse(raw);
  if (!audio && !parsed?.success) throw new AppError("invalid_body", 400);
  let session = await getSession(db, token); const now = new Date();
  let message = parsed?.success ? parsed.data.message : "";
  await rateLimit(db, hashToken(`chat-total:${session.id}`), 20, now, +session.expiresAt - +now);
  await rateLimit(db, hashToken(`chat-minute:${session.id}`), numericEnv("AI_SESSION_PER_MINUTE", 6, 20), now);
  await rateLimit(db, hashToken("chat-global-minute"), numericEnv("AI_GLOBAL_PER_MINUTE", 30, 120), now);
  await recordEvent(db, "chat_asked", {}, session);
  let intent = classifyIntent(message);
  let detectedLanguage = textLanguage(message, session.locale as Locale);
  const locale = detectedLocale(detectedLanguage), started = Date.now();
  if (!audio) session = { ...session, locale };
  let mode: ChatMode = "demo", model = "template", inputTokens = 0, outputTokens = 0, errorCode: string | null = null;
  let answer: Answer = redirect(locale, "unverified"), items: CulturalItem[] = [], unavailable = false;
  const conversational = !audio ? conversationalAnswer(message, locale) : null;
  if (!audio && intent !== "culture") answer = redirect(locale, intent);
  else if (conversational) answer = conversational;
  else {
    items = await retrieve(db, session, message, !!audio);
    const history = (await chatHistory(db, session)).filter(row => classifyIntent(row.text) === "culture" && !conversationalAnswer(row.text, locale) && (!row.reply || row.reply.intent === "culture")).slice(-4).map(row => ({ role: row.role, text: row.text.slice(0, 1200) }));
    const input: AiInput = { message, locale, items, history, audio }, demo = new DemoAiProvider();
    if (process.env.GEMINI_API_KEY?.trim() && (items.length || audio)) {
      model = defaultModel;
      try {
        const provider = new GeminiProvider(); model = provider.model;
        const generated = await provider.generate(input);
        answer = generated.answer; detectedLanguage = answer.detectedLanguage; ({ inputTokens, outputTokens } = generated.usage); mode = "gemini";
        if (audio) message = generated.transcript!;
      } catch (error) {
        errorCode = error instanceof AiError ? error.code : "provider_error";
        if (error instanceof AiError) { ({ inputTokens, outputTokens } = error.usage); if (audio && error.transcript) { message = error.transcript; detectedLanguage = textLanguage(message, locale); } }
        unavailable = !!audio && !message;
        answer = (await demo.generate({ ...input, message })).answer;
      }
    } else { model = "demo"; unavailable = !!audio; answer = (await demo.generate(input)).answer; if (audio) errorCode = "voice_not_configured"; }
    if (audio && message) {
      intent = classifyIntent(message);
      const responseLocale = detectedLocale(detectedLanguage);
      const fixed = conversationalAnswer(message, responseLocale);
      if (intent !== "culture" || fixed) { answer = intent !== "culture" ? redirect(responseLocale, intent) : fixed!; mode = "demo"; }
    }
  }
  await db.insert(s.aiUsage).values({ model, inputTokens, outputTokens, latencyMs: Date.now() - started, errorCode, mode });
  if (unavailable) throw new AppError("voice_unavailable", 503);
  answer.detectedLanguage = detectedLanguage;
  if (detectedLanguage === "other") { const text = "I currently speak English and Spanish. Would you like to explore Dominican culture in English?"; answer = { ...fixedAnswer(text), detectedLanguage: "other" }; mode = "demo"; }
  return persistReply(db, token, session, message, answer, items, mode, audio ? message : undefined);
}
