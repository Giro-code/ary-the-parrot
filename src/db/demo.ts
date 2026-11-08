import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "./client.ts";
import * as s from "./schema.ts";
import { emailHash, encrypt } from "../server/crypto.ts";
export const demoIds = { airport: "4b000000-0000-4000-8000-000000000001", a: "4b000000-0000-4000-8000-000000000002", b: "4b000000-0000-4000-8000-000000000003", providerA: "4b000000-0000-4000-8000-000000000004", providerB: "4b000000-0000-4000-8000-000000000005", offerA: "4b000000-0000-4000-8000-000000000006", offerB: "4b000000-0000-4000-8000-000000000007", kiosk: "4b000000-0000-4000-8000-000000000008" };
export const demoStaff = [
  { id: "4b000000-0000-4000-8000-000000000011", email: "admin.demo@example.invalid", org: demoIds.airport, role: "superadmin" },
  { id: "4b000000-0000-4000-8000-000000000012", email: "provider-a.demo@example.invalid", org: demoIds.a, role: "provider_admin" },
  { id: "4b000000-0000-4000-8000-000000000013", email: "provider-b.demo@example.invalid", org: demoIds.b, role: "provider_editor" },
  { id: "4b000000-0000-4000-8000-000000000014", email: "analyst.demo@example.invalid", org: demoIds.airport, role: "analyst" },
];
const orgIds = [demoIds.airport, demoIds.a, demoIds.b];
export async function resetDemo(db: Database) {
  await db.transaction(async tx => {
    const orgs = await tx.select().from(s.organizations).where(inArray(s.organizations.id, orgIds));
    if (orgs.some(org => !org.demo)) throw new Error("Demo namespace collision");
    await tx.delete(s.analyticsEvents).where(and(inArray(s.analyticsEvents.organizationId, orgIds), sql`${s.analyticsEvents.metadata}->>'demo' = 'true'`));
    await tx.delete(s.auditLogs).where(inArray(s.auditLogs.organizationId, orgIds));
    // Kiosk FK is SET NULL; remove this specific synthetic device first.
    await tx.delete(s.kioskDevices).where(and(eq(s.kioskDevices.id, demoIds.kiosk), eq(s.kioskDevices.organizationId, demoIds.airport)));
    await tx.delete(s.organizations).where(and(inArray(s.organizations.id, orgIds), eq(s.organizations.demo, true)));
    for (const account of demoStaff) {
      const other = await tx.select().from(s.memberships).where(eq(s.memberships.userId, account.id));
      if (!other.length) await tx.delete(s.visitorAccounts).where(and(eq(s.visitorAccounts.id, account.id), eq(s.visitorAccounts.emailLookupHash, emailHash(account.email))));
    }
  });
}
export async function seedDemo(db: Database) {
  await db.transaction(async tx => {
    for (const [id, name, kind] of [[demoIds.airport, "Demo Airport (ficticio)", "airport"], [demoIds.a, "Demo Proveedor A (ficticio)", "provider"], [demoIds.b, "Demo Proveedor B (ficticio)", "provider"]]) {
      const [existing] = await tx.select().from(s.organizations).where(eq(s.organizations.id, id));
      if (existing && !existing.demo) throw new Error("Demo namespace collision");
      await tx.insert(s.organizations).values({ id, name, kind, demo: true }).onConflictDoNothing();
    }
    for (const row of demoStaff) {
      await tx.insert(s.visitorAccounts).values({ id: row.id, emailLookupHash: emailHash(row.email), emailEncrypted: encrypt(row.email) }).onConflictDoNothing();
      const [account] = await tx.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, row.id));
      if (account?.emailLookupHash !== emailHash(row.email)) throw new Error("Demo account collision");
      await tx.insert(s.memberships).values({ userId: row.id, organizationId: row.org, role: row.role }).onConflictDoNothing();
    }
    for (const [id, organizationId, name, offerId] of [[demoIds.providerA, demoIds.a, "Demo Taller del Caribe (ficticio)", demoIds.offerA], [demoIds.providerB, demoIds.b, "Demo Paseo Cultural (ficticio)", demoIds.offerB]]) {
      const [provider] = await tx.select().from(s.providers).where(eq(s.providers.id, id));
      const [offer] = await tx.select().from(s.offers).where(eq(s.offers.id, offerId));
      if ((provider && provider.organizationId !== organizationId) || (offer && offer.providerId !== id)) throw new Error("Demo provider collision");
      await tx.insert(s.providers).values({ id, organizationId, name, approvedStatus: "approved" }).onConflictDoNothing();
      await tx.insert(s.offers).values({ id: offerId, providerId: id, title: `DEMO · Experiencia de ${name}`, approvedStatus: "approved", pricingDisclaimer: "Demostración ficticia. Sin reserva, precio ni servicio real.", sponsored: true }).onConflictDoNothing();
    }
    const [kiosk] = await tx.select().from(s.kioskDevices).where(eq(s.kioskDevices.id, demoIds.kiosk));
    if (kiosk && kiosk.organizationId !== demoIds.airport) throw new Error("Demo kiosk collision");
    await tx.insert(s.kioskDevices).values({ id: demoIds.kiosk, organizationId: demoIds.airport, locationLabel: "DEMO · Kiosco sintético (sin conexión física)", status: "pending", firmwareVersion: "demo-synthetic" }).onConflictDoNothing();
    await tx.delete(s.analyticsEvents).where(and(inArray(s.analyticsEvents.organizationId, orgIds), sql`${s.analyticsEvents.metadata}->>'demo' = 'true'`));
    const events = [];
    for (const eventType of ["session_started", "qr_generated", "qr_redeemed", "item_saved", "account_verified", "lead_shared", "offer_viewed", "offer_clicked", "preferences_set", "chat_asked"]) {
      const total = eventType === "qr_generated" ? 30 : eventType === "chat_asked" ? 3 : 12;
      for (let i = 0; i < total; i++) events.push({ eventType, organizationId: demoIds.airport, kioskDeviceId: demoIds.kiosk, providerId: ["lead_shared", "offer_viewed", "offer_clicked"].includes(eventType) ? demoIds.providerA : null, metadata: { demo: true, ...(eventType === "session_started" ? { locale: i < 10 ? "es" : "en" } : {}), ...(eventType === "preferences_set" ? { interests: ["music", "food"] } : {}) } });
    }
    await tx.insert(s.analyticsEvents).values(events);
  });
}
