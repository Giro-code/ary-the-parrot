import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";

export type AnalyticsFilter = { from: Date; to: Date; kioskId?: string; organizationId?: string };
export const suppress = (value: number): number | "<10" => value < 10 ? "<10" : value;
export async function overview(db: Database, filter: AnalyticsFilter, providerOrganizationId?: string) {
  const predicate = and(gte(s.analyticsEvents.createdAt, filter.from), lte(s.analyticsEvents.createdAt, filter.to), filter.kioskId ? eq(s.analyticsEvents.kioskDeviceId, filter.kioskId) : undefined, filter.organizationId ? eq(s.analyticsEvents.organizationId, filter.organizationId) : undefined,
    providerOrganizationId ? sql`${s.analyticsEvents.providerId} in (select id from providers where organization_id = ${providerOrganizationId})` : undefined);
  // All aggregation happens in SQL; no visitor records are loaded.
  const events = await db.select({ key: s.analyticsEvents.eventType, count: count() }).from(s.analyticsEvents).where(predicate).groupBy(s.analyticsEvents.eventType);
  const counts = Object.fromEntries(events.map(row => [row.key, Number(row.count)]));
  const keys = providerOrganizationId ? ["offer_viewed", "offer_clicked", "lead_shared"] : ["session_started", "qr_generated", "qr_redeemed", "item_viewed", "item_saved", "chat_asked", "account_verified", "lead_shared", "offer_viewed", "offer_clicked"];
  const dimensions = await db.select({ locale: sql<string>`${s.analyticsEvents.metadata}->>'locale'`, count: count() }).from(s.analyticsEvents).where(and(predicate, eq(s.analyticsEvents.eventType, "session_started"))).groupBy(sql`${s.analyticsEvents.metadata}->>'locale'`);
  const interests = await db.execute<{ key: string; total: number }>(sql`select interest as key, count(*)::int as total from ${s.analyticsEvents}, jsonb_array_elements_text(case when jsonb_typeof(metadata->'interests') = 'array' then metadata->'interests' else '[]'::jsonb end) interest where ${predicate} and event_type = 'preferences_set' group by interest`);
  const topics = await db.select({ key: s.culturalItems.type, count: count() }).from(s.analyticsEvents).innerJoin(s.culturalItems, eq(s.analyticsEvents.culturalItemId, s.culturalItems.id)).where(and(predicate, eq(s.analyticsEvents.eventType, "item_viewed"))).groupBy(s.culturalItems.type);
  return { sampleSize: suppress(providerOrganizationId ? counts.offer_viewed || 0 : counts.session_started || 0), sampleDefinition: providerOrganizationId ? "Eventos de vista de ofertas (no personas únicas)" : "Sesiones iniciadas (no personas únicas)", from: filter.from.toISOString(), to: filter.to.toISOString(),
    metrics: keys.map(key => ({ key, value: suppress(counts[key] || 0) })),
    qrRedemptionRatio: !providerOrganizationId && (counts.qr_generated || 0) >= 10 && (counts.qr_redeemed || 0) >= 10 && (counts.qr_generated - counts.qr_redeemed) >= 10 ? `${Math.round(counts.qr_redeemed / counts.qr_generated * 100)}%` : "<10",
    languages: providerOrganizationId ? [] : ["es", "en"].map(key => ({ key, value: suppress(Number(dimensions.find(row => row.locale === key)?.count || 0)) })),
    interests: providerOrganizationId ? [] : interests.rows.filter(row => ["history", "food", "music", "nature", "art", "adventure"].includes(row.key)).map(row => ({ key: row.key, value: suppress(Number(row.total)) })),
    topics: providerOrganizationId ? [] : topics.map(row => ({ key: row.key, value: suppress(Number(row.count)) })),
  };
}
export function overviewCsv(data: Awaited<ReturnType<typeof overview>>) {
  const cell = (v: unknown) => `"${String(v).replaceAll('"', '""')}"`;
  return [["grupo", "metrica", "valor"], ["muestra", data.sampleDefinition, data.sampleSize], ["QR", "ratio", data.qrRedemptionRatio], ...["metrics", "languages", "interests", "topics"].flatMap(group => data[group as "metrics"].map(row => [group, row.key, row.value]))].map(row => row.map(cell).join(",")).join("\r\n");
}
