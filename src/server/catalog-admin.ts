import { eq } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import { culturalItems } from "../db/schema.ts";
import { createCatalogSearch, invalidateCatalogSearch } from "./ai/catalog-search.ts";
import { audit, operators, type Staff } from "./staff.ts";
import { AppError } from "./errors.ts";
import { itemMedia } from "./item-media.ts";

export async function staffCatalog(db: Database, filters: { query?: string; type?: string; region?: string; origin?: string; visibility?: string }) {
  const all = await db.select().from(culturalItems).orderBy(culturalItems.contentKey, culturalItems.language);
  const filtered = all.filter(row => (!filters.type || row.type === filters.type) && (!filters.region || row.region === filters.region) && (!filters.origin || row.origin === filters.origin) && (!filters.visibility || (filters.visibility === "hidden" ? !!row.hiddenAt : !row.hiddenAt)));
  const hits = filters.query ? createCatalogSearch(filtered).search(filters.query, filtered.length).map(hit => hit.item) : filtered;
  const keys = [...new Set(hits.map(row => row.contentKey))];
  return { types: [...new Set(all.map(r => r.type))].sort(), regions: [...new Set(all.map(r => r.region).filter((r): r is string => !!r))].sort(),
    items: keys.map(key => {
      const versions = all.filter(row => row.contentKey === key);
      const row = hits.find(r => r.contentKey === key)!;
      return { id: row.id, contentKey: key, titles: { es: versions.find(v => v.language === "es")?.title, en: versions.find(v => v.language === "en")?.title },
        summary: row.summary, facts: row.facts.length, sources: row.sources, type: row.type, region: row.region, origin: row.origin, hidden: !!row.hiddenAt,
        image: itemMedia({ ...row, hiddenAt: null }, row.language === "en" ? "en" : "es").image };
    }) };
}
export async function catalogVisibility(db: Database, staff: Staff, id: string, hidden: boolean) {
  if (!operators.includes(staff.role)) throw new AppError("staff_forbidden", 403);
  await db.transaction(async tx => {
    const [item] = await tx.select().from(culturalItems).where(eq(culturalItems.id, id));
    if (!item) throw new AppError("not_found", 404);
    await tx.update(culturalItems).set({ hiddenAt: hidden ? new Date() : null }).where(eq(culturalItems.contentKey, item.contentKey));
    await audit(tx, staff, hidden ? "catalog.hide" : "catalog.show", "cultural_item", item.id, { contentKey: item.contentKey });
  });
  invalidateCatalogSearch();
  return { saved: true };
}
