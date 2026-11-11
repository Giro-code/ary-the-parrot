import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { validateCatalog } from "../../data/catalog/validate.mjs";
import type { Database } from "./client.ts";
import { culturalItems } from "./schema.ts";

// Manually reviewed identity mapping, never a fuzzy entity match.
export const catalogMerges: Record<string, string> = {
  merengue: "merengue", bachata: "bachata", mangu: "mangu", carnaval: "carnaval",
  haitises: "haitises", ballenas: "ballenas", larimar: "larimar", ambar: "ambar",
  "altos-chavon": "altos-chavon", "ciudad-colonial": "ciudad-colonial", cocolo: "cocolo", congos: "congos",
};
type Bilingual = { es: string; en: string };
export type CatalogCandidate = {
  key: string; kind: string; province: string; title: Bilingual; summary: Bilingual; description: Bilingual;
  aliases: { es: string[]; en: string[] }; tags: string[]; facts: { text: Bilingual; sourceUrl: string }[];
  sources: { url: string; editor: string; checkedAt: string; httpStatus: number }[];
  images: { file: string; thumb: string; author: string; license: string; licenseUrl: string; sourceUrl: string; alt: Bilingual }[];
  location?: { label: string; lat: number; lng: number } | null; reviewNotes: string;
};
export async function readCatalog(): Promise<CatalogCandidate[]> {
  return JSON.parse(await readFile("data/catalog/candidates.json", "utf8"));
}
function stable(value: unknown) {
  return JSON.stringify(value, (_key, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
}
export async function importCatalog(db: Database, raw: unknown, options: { production?: boolean } = {}) {
  // Entire validation (including local image bytes) precedes any database operation.
  const validation = await validateCatalog(raw);
  if (validation.errors.length) throw new Error(`Invalid catalog: ${validation.errors.join("; ")}`);
  const candidates = raw as CatalogCandidate[];
  return db.transaction(async tx => {
    const result = { inserted: 0, updated: 0, merged: 0, skipped: 0, reasons: {} as Record<string, number> };
    for (const c of candidates) for (const language of ["es", "en"] as const) {
      const contentKey = catalogMerges[c.key] || c.key;
      const [old] = await tx.select().from(culturalItems).where(and(eq(culturalItems.contentKey, contentKey), eq(culturalItems.language, language))).for("update");
      if (old?.origin === "seed" && !catalogMerges[c.key]) {
        result.skipped++; result.reasons.protected_seed = (result.reasons.protected_seed || 0) + 1; continue;
      }
      const primary = c.sources.find(source => source.httpStatus === 200 && source.checkedAt)!;
      const gallery = c.images.map(im => ({ file: im.file, thumb: im.thumb, credit: im.author,
        license: { code: im.license, url: im.licenseUrl }, sourceUrl: im.sourceUrl, alt: im.alt,
        width: validation.imageDimensions[im.file].w, height: validation.imageDimensions[im.file].h,
        illustrative: c.kind === "food" && /ilustrativ|illustrative/i.test(c.reviewNotes),
      }));
      const keepSeed = old?.origin === "seed" && !!old.sourceCheckedAt && !!old.sourceUrl;
      const sources = c.sources.map(({ url, editor, checkedAt }) => ({ url, editor, checkedAt }));
      if (keepSeed && !sources.some(s => s.url === old.sourceUrl)) sources.unshift({ url: old.sourceUrl!, editor: old.editor, checkedAt: old.sourceCheckedAt!.toISOString() });
      const values = {
        contentKey, language, type: c.kind, region: c.province, tags: c.tags,
        aliases: [...new Set([...(old?.origin === "seed" ? old.aliases : []), ...c.aliases[language]])],
        title: keepSeed ? old.title : c.title[language], summary: keepSeed ? old.summary : c.summary[language],
        validatedDescription: keepSeed ? old.validatedDescription : c.description[language],
        sourceUrl: keepSeed ? old.sourceUrl : primary.url, editor: keepSeed ? old.editor : primary.editor,
        sourceCheckedAt: keepSeed ? old.sourceCheckedAt : new Date(primary.checkedAt), sources,
        facts: c.facts.map(f => ({ text: f.text[language], sourceUrl: f.sourceUrl })), gallery,
        imageAsset: gallery[0].file, image: gallery[0],
        location: c.location ? { label: c.location.label, lat: c.location.lat, lng: c.location.lng, mapsQuery: c.location.label } : old?.location || null,
        origin: old?.origin || "catalog" as const, status: "published", publishedAt: old?.publishedAt || new Date(primary.checkedAt),
        lastReviewedAt: old?.lastReviewedAt || new Date(primary.checkedAt),
        license: old?.license || "Original Ary cultural summary; photographs licensed separately.", demo: !options.production,
      };
      if (old && Object.entries(values).every(([key, value]) => stable(old[key as keyof typeof old]) === stable(value))) {
        result.skipped++; result.reasons.unchanged = (result.reasons.unchanged || 0) + 1; continue;
      }
      await tx.insert(culturalItems).values(values).onConflictDoUpdate({ target: [culturalItems.contentKey, culturalItems.language], set: values });
      if (!old) result.inserted++; else if (catalogMerges[c.key] && old.origin === "seed") result.merged++; else result.updated++;
    }
    return result;
  });
}
