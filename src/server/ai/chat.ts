import { and, desc, eq, gt, inArray } from "drizzle-orm";
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
import { archiveConversation } from "../conversations.ts";
import { requestedDestination } from "../places.ts";
import { itemImageSchema, itemMedia } from "../item-media.ts";

// Card summaries end on a whole word with an ellipsis, never mid-word.
function shortSummary(text: string, max = 180) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max), space = cut.lastIndexOf(" ");
  return `${(space > max * .6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}
export { classifyIntent } from "./safety.ts";

export const chatInputSchema = z.object({ message: z.string().trim().min(1).max(500) }).strict();
export const cueSchema = z.object({ cue: z.enum(["welcome", "interests", "idle"]) }).strict();
export type ChatMode = "gemini" | "demo";
const sourceSchema = z.object({ id: z.uuid(), title: z.string(), summary: z.string().default(""), url: z.url().refine(value => value.startsWith("https://")), editor: z.string(), location: z.string().max(280).optional(), image: itemImageSchema.optional(), mapsUrl: z.string().regex(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=-?[\d.]+,-?[\d.]+$/).optional() });
export type ChatSource = z.infer<typeof sourceSchema>;
export type ChatReply = Answer & { answer: string; messageId: string; transcript?: string; destination?: string; preferences?: ConversationPreferences; mode: ChatMode; sources: ChatSource[]; handoff: boolean };
export const replySchema = answerSchema.extend({ answer: z.string(), messageId: z.uuid(), destination: z.string().max(160).optional(), mode: z.enum(["gemini", "demo"]), handoff: z.boolean(), sources: z.array(sourceSchema).max(6) });
const historyPayloadSchema = z.object({ text: z.string().max(1200), reply: replySchema.optional() });
function citedSources(items: CulturalItem[], ids: string[], locale: Locale): ChatSource[] {
  return items.filter(item => ids.includes(item.id) && item.status === "published" && item.sourceUrl?.startsWith("https://") && item.sourceCheckedAt).map(item => ({ id: item.id, title: item.title, summary: shortSummary(item.summary), url: item.sourceUrl!, editor: item.editor, ...itemMedia(item, locale) }));
}
export async function chatHistory(db: Database, session: Session) {
  const rows = await db.select().from(s.chatMessages).where(and(eq(s.chatMessages.sessionId, session.id), gt(s.chatMessages.retentionUntil, new Date()))).orderBy(desc(s.chatMessages.createdAt), desc(s.chatMessages.id)).limit(40);
  const messages = rows.reverse().flatMap(row => {
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
  // Re-read citations so pre-stage9 history gains media and withdrawn records lose it.
  const ids = [...new Set(messages.flatMap(row => row.reply?.citedItemIds || []))];
  const items = ids.length ? await db.select().from(s.culturalItems).where(and(inArray(s.culturalItems.id, ids), eq(s.culturalItems.status, "published"))) : [];
  for (const row of messages) if (row.reply) {
    const locale = detectedLocale(row.reply.detectedLanguage);
    row.reply.sources = citedSources(await localizeItems(db, items, locale), row.reply.citedItemIds, locale);
    row.reply.citedItemIds = row.reply.sources.map(source => source.id);
  }
  return messages;
}
async function retrieve(db: Database, session: Session, message: string, audio = false) {
  const rows = await db.select().from(s.culturalItems).where(and(eq(s.culturalItems.status, "published"), eq(s.culturalItems.language, session.locale))).limit(100);
  const words = normalize(message).split(/\W+/).filter(word => word.length >= 4 && !["como", "llego", "llegar", "quiero", "donde", "queda", "esta", "estan", "ubicacion", "mapa", "location", "want", "where", "would", "like", "directions", "take", "visitar", "visit", "reach", "tell", "about", "cuentame", "sobre"].includes(word));
  return rows.filter(item => { try { return item.sourceUrl && new URL(item.sourceUrl).protocol === "https:" && !injection.test([item.title, item.summary, item.validatedDescription].join(" ")); } catch { return false; } }).map(item => {
    const text = normalize(`${item.title} ${item.summary} ${item.tags.join(" ")}`);
    const lexical = words.reduce((score, word) => score + (text.includes(word) ? 3 : 0), 0);
    return { item, lexical, score: lexical + item.tags.filter(tag => session.interests.includes(tag)).length };
  }).filter(row => audio || row.lexical > 0).sort((a, b) => b.score - a.score || a.item.contentKey.localeCompare(b.item.contentKey)).slice(0, audio ? 12 : 6).map(row => ({ ...row.item, validatedDescription: row.item.validatedDescription.slice(0, audio ? 1000 : 1800) }));
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
  const destination = answer.intent === "directions" && message ? requestedDestination(message) : undefined;
  const sensitive = answer.intent !== "culture" && answer.intent !== "preferences";
  const sources = citedSources(items, answer.citedItemIds, detectedLocale(answer.detectedLanguage));
  const reply: ChatReply = { ...answer, citedItemIds: sources.map(source => source.id), spokenText: answer.intent === "directions" && sources.some(source => source.mapsUrl) ? answer.spokenText : spokenText(answer.displayText, answer.spokenText, sensitive, greeting), answer: answer.displayText, messageId, mode, handoff: answer.intent === "sensitive", sources };
  const preferences = message ? { ...conversationPreferences(message, { locale: session.locale as Locale, countryDeclared: session.countryDeclared, interests: session.interests as ConversationPreferences["interests"] }), locale: detectedLocale(answer.detectedLanguage) } : undefined;
  if (destination) reply.destination = destination;
  if (preferences) await setPreferences(db, session, preferences);
  await db.transaction(async tx => {
    const [active] = await tx.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, new Date()))).for("update");
    if (!active) return;
    if (active.conversationId !== session.conversationId) throw new AppError("conversation_changed", 409);
    if (message) await tx.insert(s.chatMessages).values({ sessionId: active.id, role: "user", encryptedPayload: encrypt(JSON.stringify({ text: message })), retentionUntil: active.expiresAt, createdAt: new Date() });
    await tx.insert(s.chatMessages).values({ id: messageId, sessionId: active.id, role: "assistant", encryptedPayload: encrypt(JSON.stringify({ text: reply.displayText, reply })), provenance: { mode, citedItemIds: reply.citedItemIds }, retentionUntil: active.expiresAt, createdAt: new Date(Date.now() + 1) });
    await archiveConversation(tx, active);
  });
  await getSession(db, token);
  return { ...reply, ...(preferences ? { preferences } : {}), ...(transcript ? { transcript } : {}) };
}
async function directionItems(db: Database, session: Session, message: string) {
  const items = await retrieve(db, session, message);
  if (items.length) return items.slice(0, 1);
  const history = await chatHistory(db, session);
  const ids = history.findLast(row => row.reply?.citedItemIds.length)?.reply?.citedItemIds || [];
  // Only use conversational context for a location-only question, never an unknown named place.
  const destination = requestedDestination(message);
  if (destination || !ids.length) return [];
  return db.select().from(s.culturalItems).where(and(inArray(s.culturalItems.id, ids), eq(s.culturalItems.status, "published"))).limit(3);
}
function directionsAnswer(items: CulturalItem[], locale: Locale, kiosk: boolean): Answer {
  const sources = citedSources(items, items.map(item => item.id), locale);
  const places = sources.filter(source => source.mapsUrl).map(source => source.location).join(" · ");
  const copy = locale === "es" ? {
    screen: "Te dejé la ubicación en pantalla.",
    phone: "Continúa en tu teléfono para abrir la ubicación.",
    missing: "Puedes guardar el lugar en Mi cultura. La ficha aún no tiene una ubicación verificada.",
  } : {
    screen: "I've left the location on screen.",
    phone: "Continue on your phone to open the location.",
    missing: "You can save the place in My culture. The card has no verified location yet.",
  };
  const cue = kiosk ? copy.phone : copy.screen;
  const text = places ? `${places}. ${cue}` : copy.missing;
  return { ...fixedAnswer(text, "directions"), detectedLanguage: locale, citedItemIds: sources.map(source => source.id), spokenText: places ? cue : text };
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
  const conversational = !audio && /^(espanol|english|soy de |vengo de |visito desde |i am from |i'm from |prefiero no decirlo|prefer not to say)/.test(normalize(message)) ? conversationalAnswer(message, locale) : null;
  if (!audio && ["sensitive", "injection", "unverified"].includes(intent)) answer = redirect(locale, intent);
  else if (!audio && intent === "directions") {
    items = await directionItems(db, session, message);
    answer = directionsAnswer(items, locale, !!session.kioskDeviceId);
  }
  else if (conversational) answer = conversational;
  else {
    items = await retrieve(db, session, message, !!audio);
    const history = (await chatHistory(db, session)).filter(row => ["culture", "general", "directions"].includes(classifyIntent(row.text)) && !conversationalAnswer(row.text, locale) && (!row.reply || ["culture", "general", "directions"].includes(row.reply.intent))).slice(-4).map(row => ({ role: row.role, text: row.text.slice(0, 1200) }));
    const input: AiInput = { message, locale, items, history, audio }, demo = new DemoAiProvider();
    if (session.retentionClass !== "kiosk_demo" && process.env.GEMINI_API_KEY?.trim() && (items.length || audio || intent === "general")) {
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
      if (["sensitive", "injection", "unverified"].includes(intent)) { answer = redirect(responseLocale, intent); mode = "demo"; }
      else if (intent === "directions") { items = await directionItems(db, { ...session, locale: responseLocale }, message); answer = directionsAnswer(items, responseLocale, !!session.kioskDeviceId); }
      else if (fixed && /^(espanol|english|soy de |vengo de |visito desde |i am from |i'm from |prefiero no decirlo|prefer not to say)/.test(normalize(message))) { answer = fixed; mode = "demo"; }
    }
  }
  await db.insert(s.aiUsage).values({ model, inputTokens, outputTokens, latencyMs: Date.now() - started, errorCode, mode });
  if (unavailable) throw new AppError("voice_unavailable", 503);
  if (answer.intent === "directions") answer = directionsAnswer(items.filter(item => answer.citedItemIds.includes(item.id)), detectedLocale(detectedLanguage), !!session.kioskDeviceId);
  answer.detectedLanguage = detectedLanguage;
  if (detectedLanguage === "other") { const text = "I currently speak English and Spanish. Would you like to explore Dominican culture in English?"; answer = { ...fixedAnswer(text), detectedLanguage: "other" }; mode = "demo"; }
  return persistReply(db, token, session, message, answer, items, mode, audio ? message : undefined);
}
