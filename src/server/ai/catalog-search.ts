import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db/client.ts";
import { culturalItems } from "../../db/schema.ts";
import { normalize } from "../../conversation.ts";
import type { CulturalItem } from "../service.ts";
import { injection } from "./safety.ts";
import { searchTokens } from "./retrieval.ts";

export type SearchHit = { item: CulturalItem; score: number };
export interface CatalogSearch { search(query: string, limit?: number): SearchHit[] }
const groups = ["playa playas beach beaches", "cascada cascadas salto waterfall waterfalls", "comida plato food comer breakfast desayuno", "fiesta fiestas festival carnaval carnival tradition tradiciones traditions", "museo museos museum museums", "iglesia catedral church cathedral"] .map(s => s.split(" "));
const ignored = new Set("hacer puedo puede dame cinco quiero cuentame hablame dominicanas dominicanos what can doing things eat eating tell give five".split(" "));
function words(text: string) { return searchTokens(text).filter(t => !ignored.has(t)); }
function phrase(text: string) { return normalize(text).replace(/[^a-z0-9]+/g, " ").trim(); }
function forms(token: string) { return [...new Set([token, ...(token.endsWith("s") ? [token.slice(0, -1)] : []), ...(token.endsWith("es") ? [token.slice(0, -2)] : [])])]; }
function expand(token: string) { return [...new Set([...forms(token), ...(groups.find(g => g.includes(token)) || []).flatMap(forms)])]; }
// Bounded Levenshtein, including one missing character (samna / samana).
export function editOne(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}
export function createCatalogSearch(items: CulturalItem[]): CatalogSearch {
  const titleTokens = new Map(items.map(item => [item.id, words(item.title)]));
  const entries = items.map(item => {
    const weights = new Map<string, number>();
    const add = (text: string, weight: number) => words(text).flatMap(forms).forEach(t => weights.set(t, Math.max(weights.get(t) || 0, weight)));
    add([item.title, ...item.aliases].join(" "), 12);
    add([item.summary, ...item.facts.map(f => f.text)].join(" "), 5);
    add([...item.tags, item.type, item.region || ""].join(" "), 3);
    return { item, weights, phrases: [item.title, ...item.aliases].map(phrase).filter(s => s.length >= 4), region: normalize(item.region || "") };
  });
  const regions = [...new Set(entries.map(e => e.region).filter(r => r && !r.includes("nacional")))];
  return { search(query, limit = 4) {
    const normalized = phrase(query), terms = words(query), expansions = terms.map(expand);
    const region = regions.filter(r => normalized.includes(r)).sort((a, b) => b.length - a.length)[0] || regions.find(r => !r.includes(" ") && terms.some(t => t.length >= 5 && editOne(t, r)));
    const category = /\b(comer|comida|platos?|food|eat|eating)\b/.test(normalized) ? "food" : /\b(playas?|beach(?:es)?)\b/.test(normalized) ? "beach" : /\b(fiestas?|festival|tradiciones|traditions|carnaval|carnival)\b/.test(normalized) ? "tradition" : /\b(museos?|museums?)\b/.test(normalized) ? "museum" : undefined;
    const destination = category ? normalized.match(/\b(?:en|in)\s+(.+?)[?.!]*$/)?.[1]?.trim() : undefined;
    const destinationExists = destination && !region && entries.some(e => e.phrases.some(p => p.includes(destination)));
    const scored = entries.flatMap(entry => {
      if (category && entry.item.type !== category) return [];
      if (destinationExists && ![...entry.phrases, normalize(entry.item.summary)].some(p => p.includes(destination))) return [];
      let score = expansions.reduce((total, alternatives, index) => {
        let best = Math.max(0, ...alternatives.map(t => entry.weights.get(t) || 0));
        if (!best && terms[index].length >= 5) for (const [token, weight] of entry.weights) if (weight >= 12 && editOne(terms[index], token)) best = Math.max(best, weight * .7);
        return total + best;
      }, 0);
      const exact = entry.phrases.some(p => (` ${normalized} `).includes(` ${p} `));
      if (exact) score += 1000;
      if (terms.length === 1 && terms[0].length >= 5 && editOne(terms[0], normalize(entry.item.title))) score += 200;
      if (category) score += 12;
      if (region && entry.region === region) score += 80;
      if (region && entry.region !== region && !exact) return [];
      return score > 0 ? [{ item: entry.item, score }] : [];
    }).sort((a, b) => b.score - a.score || a.item.contentKey.localeCompare(b.item.contentKey));
    if (!category && scored[0]?.score >= 1000 && !/\b(y|and|hacer|things|visitar|do)\b/.test(normalized)) return scored.filter(hit => hit.score >= 1000).slice(0, limit);
    if (!category && !region && !/\b([2-9]|lista|list|varias|varios)\b/.test(normalized)) return scored.slice(0, limit);
    const selected: SearchHit[] = [];
    while (scored.length && selected.length < limit) {
      const adjusted = new Map(scored.map(hit => [hit.item.id, hit.score - selected.reduce((penalty, s) => penalty + (s.item.region === hit.item.region ? 8 : 0) + titleTokens.get(s.item.id)!.filter(t => titleTokens.get(hit.item.id)!.includes(t)).length * 12, 0)]));
      scored.sort((a, b) => adjusted.get(b.item.id)! - adjusted.get(a.item.id)!);
      selected.push(scored.shift()!);
    }
    return selected;
  } };
}
type Cache = { expires: number; pending: Promise<CatalogSearch> };
let cache = new WeakMap<Database, Map<string, Cache>>();
export function invalidateCatalogSearch() { cache = new WeakMap(); }
export async function catalogSearch(db: Database, language: string): Promise<CatalogSearch> {
  let languages = cache.get(db);
  if (!languages) { languages = new Map(); cache.set(db, languages); }
  const current = languages.get(language);
  if (current && current.expires > Date.now()) return current.pending;
  const pending = db.select().from(culturalItems).where(and(eq(culturalItems.language, language), eq(culturalItems.status, "published"), isNull(culturalItems.hiddenAt))).then(rows => createCatalogSearch(rows.filter(item => {
    try { return !!item.sourceCheckedAt && new URL(item.sourceUrl || "").protocol === "https:" && !injection.test([item.title, item.summary, item.validatedDescription, ...item.aliases, ...item.facts.map(f => f.text), ...item.tags].join(" ")); } catch { return false; }
  })));
  const entry = { expires: Date.now() + 300_000, pending }; languages.set(language, entry);
  try { return await pending; } catch (error) { if (languages.get(language) === entry) languages.delete(language); throw error; }
}
