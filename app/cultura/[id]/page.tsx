import { getConnection } from "../../../src/db/client";
import { cookies } from "next/headers";
import { optionalSession } from "../../../src/server/auth";
import { recordEvent } from "../../../src/server/service";
import { findItem } from "../../../src/server/service";
import { uuidSchema } from "../../../src/server/http";
import { PublicCulture } from "../../../src/components/public-culture";
import { culturalItems } from "../../../src/db/schema";
import { and, eq } from "drizzle-orm";
import type { Item } from "../../../src/components/types";
export const dynamic = "force-dynamic";
export default async function CulturalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let item;
  try {
    if (!uuidSchema.safeParse(id).success) throw new Error();
    const { db } = await getConnection(); item = await findItem(db, id);
    const session = await optionalSession(db, (await cookies()).get("ary_sid")?.value);
    await recordEvent(db, "item_viewed", {}, session || undefined, { culturalItemId: id });
  } catch { /* Render an honest unavailable state below. */ }
  if (!item) return <PublicCulture items={{}} />;
  const { db } = await getConnection();
  const translations = await db.select().from(culturalItems).where(and(eq(culturalItems.contentKey, item.contentKey), eq(culturalItems.status, "published")));
  const items = Object.fromEntries(translations.map(row => [row.language, JSON.parse(JSON.stringify(row))])) as Partial<Record<"en" | "es", Item>>;
  return <PublicCulture items={items} />;
}
