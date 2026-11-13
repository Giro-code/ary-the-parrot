import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
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
import { hasSearchTerms } from "./retrieval.ts";
import { catalogSearch, grounded, type SearchAnalysis } from "./catalog-search.ts";

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
const sourceSchema = z.object({ id: z.uuid(), title: z.string(), summary: z.string().default(""), url: z.url().refine(value => value.startsWith("https://")), editor: z.string(), location: z.string().max(280).optional(), image: itemImageSchema.optional(), gallery: z.array(itemImageSchema).max(6).optional(), mapsUrl: z.string().regex(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=-?[\d.]+,-?[\d.]+$/).optional() });
export type ChatSource = z.infer<typeof sourceSchema>;
export type ChatReply = Answer & { answer: string; messageId: string; transcript?: string; destination?: string; preferences?: ConversationPreferences; mode: ChatMode; sources: ChatSource[]; handoff: boolean };
export const replySchema = answerSchema.extend({ answer: z.string(), messageId: z.uuid(), destination: z.string().max(160).optional(), mode: z.enum(["gemini", "demo"]), handoff: z.boolean(), sources: z.array(sourceSchema).max(6) });
const historyPayloadSchema = z.object({ text: z.string().max(1200), reply: replySchema.optional() });
function citedSources(items: CulturalItem[], ids: string[], locale: Locale): ChatSource[] {
  return items.filter(item => !item.hiddenAt && ids.includes(item.id) && item.status === "published" && item.sourceUrl?.startsWith("https://") && item.sourceCheckedAt).map(item => ({ id: item.id, title: item.title, summary: shortSummary(item.summary), url: item.sourceUrl!, editor: item.editor, ...itemMedia(item, locale) }));
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
  const items = ids.length ? await db.select().from(s.culturalItems).where(and(inArray(s.culturalItems.id, ids), isNull(s.culturalItems.hiddenAt), eq(s.culturalItems.status, "published"))) : [];
  for (const row of messages) if (row.reply) {
    const locale = detectedLocale(row.reply.detectedLanguage);
    row.reply.sources = citedSources(await localizeItems(db, items, locale), row.reply.citedItemIds, locale);
    row.reply.citedItemIds = row.reply.sources.map(source => source.id);
  }
  return messages;
}
async function analyze(db: Database, session: Session, message: string, audio = false): Promise<SearchAnalysis> {
  const search = await catalogSearch(db, session.locale);
  const voiceOrder = ["merengue", "bachata", "mangu", "ciudad-colonial", "haitises", "ballenas", "carnaval", "altos-chavon"];
  if (audio && !message) {
    // Audio is not transcribed yet: a fixed shortlist the model may decline.
    const rows = voiceOrder.map(key => search.search(key, 8).find(hit => hit.item.contentKey === key)?.item).filter((item): item is CulturalItem => !!item);
    return { hits: rows.slice(0, 8).map(item => ({ item, score: 0, strength: "weak" as const })), ambiguity: null };
  }
  return search.analyze(message, audio ? 8 : 4);
}
const named = (analysis: SearchAnalysis) => analysis.hits.filter(hit => hit.strength === "exact" || hit.strength === "strong").map(hit => hit.item);
// One short name with several meanings: ask, with one button per meaning.
function clarifyAnswer(ambiguity: NonNullable<SearchAnalysis["ambiguity"]>, locale: Locale, directions: boolean): Answer {
  const es = locale === "es";
  const names = ambiguity.options.map(option => option.region ? es ? `la provincia ${option.label}` : `${option.label} province` : option.label);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${es ? "o" : "or"} ${names.at(-1)}` : names[0];
  const text = es ? `«${ambiguity.term}» puede ser varias cosas. ¿Te refieres a ${list}?` : `"${ambiguity.term}" can mean a few things. Do you mean ${list}?`;
  const followUps = ambiguity.options.map(option => option.region
    ? directions ? es ? `¿Dónde queda la provincia ${option.label}?` : `Where is ${option.label} province?` : es ? `¿Qué ver en la provincia ${option.label}?` : `What to see in ${option.label} province?`
    : directions ? es ? `¿Dónde queda ${option.label}?` : `Where is ${option.label}?` : es ? `Cuéntame sobre ${option.label}` : `Tell me about ${option.label}`).map(line => line.slice(0, 120)).slice(0, 3);
  return { ...fixedAnswer(text.slice(0, 600), "general"), detectedLanguage: locale, followUps };
}
function searchableItem(item: CulturalItem) {
  try { return !!item.sourceCheckedAt && !!item.sourceUrl && new URL(item.sourceUrl).protocol === "https:" && !injection.test([item.title, item.summary, item.validatedDescription, ...item.tags].join(" ")); } catch { return false; }
}
function fixedAnswer(text: string, intent: Answer["intent"] = "preferences"): Answer { return { detectedLanguage: "en", displayText: text, spokenText: text, intent, citedItemIds: [], followUps: [], confidence: 0 }; }
function conversationalAnswer(message: string, locale: Locale) {
  if (/^(hola[!,. ]*|hello[!,. ]*|hi[!,. ]*|espanol[.! ]*|english[.! ]*|soy de .+|vengo de .+|visito desde .+|i am from .+|i'm from .+|prefiero no decirlo[.! ]*|prefer not to say[.! ]*)$/.test(normalize(message))) return fixedAnswer(locale === "es" ? "¡Qué gusto conversar contigo! ¿Qué te gustaría descubrir? Música, comida, playas, historia…" : "Lovely to chat with you! What would you like to discover? Music, food, beaches, history…");
  return null;
}
function redirect(locale: Locale, intent: "sensitive" | "injection" | "unverified") {
  return fixedAnswer(intent === "sensitive" ? locale === "es" ? "Para vuelos, puertas, migración, aduanas, seguridad, emergencias, salud o leyes, consulta al personal del aeropuerto o la autoridad oficial. Para tus datos, abre Privacidad. Yo te acompaño con la cultura." : "For flights, gates, immigration, customs, security, emergencies, health or laws, ask airport staff or the official authority. For your data, open Privacy. I can help with culture." : locale === "es" ? "No tengo una fuente verificada para eso. ¿Descubrimos las fichas culturales?" : "I don't have a verified source for that. Shall we explore the cultural cards?", intent);
}
async function persistReply(db: Database, token: string | undefined, session: Session, message: string | null, answer: Answer, items: CulturalItem[], mode: ChatMode, transcript?: string, greeting = false, photos = false): Promise<ChatReply> {
  items = await localizeItems(db, items, detectedLocale(answer.detectedLanguage));
  const messageId = crypto.randomUUID();
  const destination = answer.intent === "directions" && message ? requestedDestination(message) : undefined;
  const sensitive = answer.intent !== "culture" && answer.intent !== "preferences";
  const sources = citedSources(items, answer.citedItemIds, detectedLocale(answer.detectedLanguage));
  if (photos && sources.length > 1) for (const source of sources) source.gallery = source.image ? [source.image] : [];
  // answerSchema allows three follow-ups; /api/voice/speak re-reads this payload.
  const reply: ChatReply = { ...answer, followUps: answer.followUps.slice(0, 3), citedItemIds: sources.map(source => source.id), spokenText: (photos && sources.some(source => source.image)) || (answer.intent === "directions" && sources.some(source => source.mapsUrl)) ? answer.spokenText : spokenText(answer.displayText, answer.spokenText, sensitive, greeting), answer: answer.displayText, messageId, mode, handoff: answer.intent === "sensitive", sources };
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
  // Only an entry the question names gets the "here is the location" answer.
  const items = named(await analyze(db, session, message));
  if (items.length) return items.slice(0, 1);
  const history = await chatHistory(db, session);
  const ids = history.findLast(row => row.reply?.citedItemIds.length)?.reply?.citedItemIds || [];
  // Only use conversational context for a location-only question, never an unknown named place.
  const destination = requestedDestination(message);
  if (destination || !ids.length) return [];
  return db.select().from(s.culturalItems).where(and(inArray(s.culturalItems.id, ids), isNull(s.culturalItems.hiddenAt), eq(s.culturalItems.status, "published"))).limit(3);
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
async function imageItems(db: Database, session: Session, message: string) {
  const relevant = (await analyze(db, session, message)).hits.filter(grounded).map(hit => hit.item);
  if (hasSearchTerms(message)) return relevant.filter(item => itemMedia(item, session.locale as Locale).image).slice(0, 3);
  const history = await chatHistory(db, session);
  const ids = history.findLast(row => row.reply?.sources.some(source => source.image))?.reply?.sources.filter(source => source.image).map(source => source.id) || [];
  const featured = ["ciudad-colonial", "haitises", "altos-chavon"];
  const rows = await db.select().from(s.culturalItems).where(and(eq(s.culturalItems.status, "published"), isNull(s.culturalItems.hiddenAt), ids.length ? inArray(s.culturalItems.id, ids) : and(eq(s.culturalItems.language, session.locale), inArray(s.culturalItems.contentKey, featured))));
  return (await localizeItems(db, rows, session.locale as Locale)).filter(item => searchableItem(item) && itemMedia(item, session.locale as Locale).image).sort((a, b) => ids.length ? ids.indexOf(a.id) - ids.indexOf(b.id) : featured.indexOf(a.contentKey) - featured.indexOf(b.contentKey)).slice(0, 3);
}
function imagesAnswer(items: CulturalItem[], locale: Locale): Answer {
  if (!items.length) return { ...fixedAnswer(locale === "es" ? "Aún no tengo fotos verificadas de ese tema. ¿Quieres ver Los Haitises o la Ciudad Colonial?" : "I don't have verified photos of that topic yet. Would you like to see Los Haitises or Ciudad Colonial?", "general"), followUps: locale === "es" ? ["Fotos de Los Haitises", "Fotos de la zona colonial"] : ["Photos of Los Haitises", "Photos of the colonial zone"] };
  const titles = items.map(item => item.title.slice(0, 150)).join(" · ");
  return { ...fixedAnswer(locale === "es" ? `¡Mira! Aquí tienes fotos de ${titles}.` : `Here are some photos of ${titles}.`, "culture"), citedItemIds: items.map(item => item.id), spokenText: locale === "es" ? "Te dejé las fotos en pantalla." : "I've put the photos on screen.", confidence: 1 };
}
export async function chatCue(db: Database, token: string | undefined, raw: unknown) {
  const parsed = cueSchema.safeParse(raw); if (!parsed.success) throw new AppError("invalid_body", 400);
  const session = await getSession(db, token), en = session.locale === "en";
  await rateLimit(db, hashToken(`chat-cue:${session.id}`), 8);
  const text = parsed.data.cue === "welcome" ? en ? "No plans? I'll guide ya! I'm Ary, the Dominican parrot. Ask me anything… ¿o prefieres español?" : "¿Sin planes? ¡Yo te guío! Soy Ary, la cotorra de República Dominicana. ¿Hablamos en español o en inglés?" : parsed.data.cue === "idle" ? en ? "Still there? Tap to stay a little longer." : "¿Sigues ahí? Toca para quedarte un poquito más." : en ? "What would you love to discover? Music, food, beaches, history… You choose!" : "¿Qué te gustaría descubrir? Música, comida, playas, historia… ¡Tú eliges!";
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
  let answer: Answer = redirect(locale, "unverified"), items: CulturalItem[] = [], unavailable = false, photos = false;
  const conversational = !audio && /^(espanol|english|soy de |vengo de |visito desde |i am from |i'm from |prefiero no decirlo|prefer not to say)/.test(normalize(message)) ? conversationalAnswer(message, locale) : null;
  const analysis = !audio && !conversational && ["culture", "general", "directions", "images"].includes(intent) ? await analyze(db, session, message) : null;
  let directionIds: string[] = [];
  if (!audio && (intent === "sensitive" || intent === "injection" || intent === "unverified")) answer = redirect(locale, intent);
  else if (analysis?.ambiguity) answer = clarifyAnswer(analysis.ambiguity, locale, intent === "directions");
  else if (!audio && intent === "directions" && (items = await directionItems(db, session, message)).length) {
    directionIds = items.map(item => item.id);
    answer = directionsAnswer(items, locale, !!session.kioskDeviceId);
  }
  else if (!audio && intent === "images") {
    items = await imageItems(db, session, message); answer = imagesAnswer(items, locale); photos = true;
  }
  else if (conversational) answer = conversational;
  else {
    const found = analysis || await analyze(db, session, message, !!audio);
    items = found.hits.map(hit => hit.item);
    const ground = found.hits.some(grounded);
    directionIds = named(found).map(item => item.id);
    if (!audio && intent === "general" && ground) intent = "culture";
    const history = (await chatHistory(db, session)).filter(row => ["culture", "general", "directions", "images"].includes(classifyIntent(row.text)) && !conversationalAnswer(row.text, locale) && (!row.reply || ["culture", "general", "directions"].includes(row.reply.intent))).slice(-4).map(row => ({ role: row.role, text: row.text.slice(0, 300) }));
    const input: AiInput = { message, locale, items, history, audio, grounded: audio ? undefined : ground }, demo = new DemoAiProvider();
    if (session.retentionClass !== "kiosk_demo" && process.env.GEMINI_API_KEY?.trim() && (items.length || audio || intent === "general" || intent === "directions")) {
      model = defaultModel;
      const provider = new GeminiProvider(), shortlist = items.map(item => item.contentKey);
      let failed = false;
      model = provider.model;
      try {
        const generated = await provider.generate(input);
        answer = generated.answer; detectedLanguage = answer.detectedLanguage; ({ inputTokens, outputTokens } = generated.usage); mode = "gemini";
        if (audio) message = generated.transcript!;
      } catch (error) {
        failed = true; errorCode = error instanceof AiError ? error.code : "provider_error";
        if (error instanceof AiError) { ({ inputTokens, outputTokens } = error.usage); if (audio && error.transcript) { message = error.transcript; detectedLanguage = textLanguage(message, locale); } }
      }
      // The audio call only sees a fixed shortlist. When the transcript matches a catalog
      // entry outside it (or that call failed), answer once more from the transcript.
      if (audio && message) {
        const heard = detectedLocale(detectedLanguage);
        const heardAnalysis = await analyze(db, { ...session, locale: heard }, message);
        const found = heardAnalysis.hits.map(hit => hit.item);
        directionIds = named(heardAnalysis).map(item => item.id);
        if (found.length && ["culture", "general"].includes(classifyIntent(message)) && (failed || !shortlist.includes(found[0].contentKey))) {
          try {
            const second = await provider.generate({ message, locale: heard, items: found, history, grounded: heardAnalysis.hits.some(grounded) });
            answer = second.answer; detectedLanguage = answer.detectedLanguage; mode = "gemini"; failed = false; errorCode = null;
            inputTokens += second.usage.inputTokens; outputTokens += second.usage.outputTokens;
          } catch (error) { failed = true; errorCode = error instanceof AiError ? error.code : "provider_error"; }
        }
        items = failed ? found : [...found, ...items.filter(item => !found.some(row => row.id === item.id))];
      }
      unavailable = !!audio && !message;
      // A failed turn is answered by the template provider; record it as such.
      if (failed) { answer = (await demo.generate({ ...input, message, items, locale: detectedLocale(detectedLanguage) })).answer; mode = "demo"; }
    } else { model = "demo"; unavailable = !!audio; answer = (await demo.generate(input)).answer; if (audio) errorCode = "voice_not_configured"; }
    if (audio && message) {
      intent = classifyIntent(message);
      const responseLocale = detectedLocale(detectedLanguage);
      const fixed = conversationalAnswer(message, responseLocale);
      const heardAmbiguity = ["culture", "general", "directions", "images"].includes(intent) ? (await analyze(db, { ...session, locale: responseLocale }, message)).ambiguity : null;
      if (intent === "sensitive" || intent === "injection" || intent === "unverified") { answer = redirect(responseLocale, intent); mode = "demo"; }
      else if (heardAmbiguity) { answer = clarifyAnswer(heardAmbiguity, responseLocale, intent === "directions"); items = []; mode = "demo"; }
      else if (intent === "directions") { const place = await directionItems(db, { ...session, locale: responseLocale }, message); if (place.length) { items = place; directionIds = place.map(item => item.id); answer = directionsAnswer(items, responseLocale, !!session.kioskDeviceId); } }
      else if (intent === "images") { items = await imageItems(db, { ...session, locale: responseLocale }, message); answer = imagesAnswer(items, responseLocale); photos = true; mode = "demo"; }
      else if (fixed && /^(espanol|english|soy de |vengo de |visito desde |i am from |i'm from |prefiero no decirlo|prefer not to say)/.test(normalize(message))) { answer = fixed; mode = "demo"; }
    }
  }
  await db.insert(s.aiUsage).values({ model, inputTokens, outputTokens, latencyMs: Date.now() - started, errorCode, mode });
  if (unavailable) throw new AppError("voice_unavailable", 503);
  // The location template only for an entry the question named; otherwise keep the AI's own words and cards.
  // Without the AI, an unnamed place keeps the "save it in My culture" answer.
  if (answer.intent === "directions" || (!audio && intent === "directions" && mode !== "gemini" && !analysis?.ambiguity)) {
    const cited = items.filter(item => answer.citedItemIds.includes(item.id) && directionIds.includes(item.id));
    if (cited.length) answer = directionsAnswer(cited, detectedLocale(detectedLanguage), !!session.kioskDeviceId);
    else if (mode !== "gemini") answer = directionsAnswer([], detectedLocale(detectedLanguage), !!session.kioskDeviceId);
  }
  answer.detectedLanguage = detectedLanguage;
  if (detectedLanguage === "other") { const text = "I currently speak English and Spanish. Would you like to explore Dominican culture in English?"; answer = { ...fixedAnswer(text), detectedLanguage: "other" }; mode = "demo"; }
  return persistReply(db, token, session, message, answer, items, mode, audio ? message : undefined, false, photos);
}
