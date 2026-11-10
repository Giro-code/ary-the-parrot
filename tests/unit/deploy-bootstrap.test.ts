import { afterEach, expect, test, vi } from "vitest";
import { connectDatabase } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { bootstrapAdmin } from "../../scripts/admin-bootstrap";
import { verifyStaffLink } from "../../src/server/staff";
import { authMagicLinks, emailOutbox, culturalItems, organizations } from "../../src/db/schema";
import { hashToken } from "../../src/server/tokens";
import { seedDatabase, seedEntries } from "../../src/db/seed";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
test("production bootstrap: 15-minute hashed link, single use, expiry, no outbox or provider", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("APP_BASE_URL", "https://arytheparrot.app");
  vi.stubEnv("AUTH_SECRET", "synthetic-auth-".repeat(4)); vi.stubEnv("SESSION_ENCRYPTION_KEY", "synthetic-encryption-".repeat(4));
  const fetch = vi.fn(() => { throw new Error("Provider forbidden"); }); vi.stubGlobal("fetch", fetch);
  const conn = await connectDatabase({ memory: true });
  try {
    await migrateDatabase(conn.db); const now = new Date();
    const url = await bootstrapAdmin(conn.db, "owner@example.invalid", "Synthetic Admin", "superadmin", true, now);
    const token = new URL(url!).searchParams.get("token")!;
    const [row] = await conn.db.select().from(authMagicLinks);
    expect(row.tokenHash === hashToken(token) && row.tokenHash !== token).toBe(true);
    expect(+row.expiresAt - +now).toBe(900_000);
    const renewed = await bootstrapAdmin(conn.db, "owner@example.invalid", "Synthetic Admin", "superadmin", true, now);
    expect((await conn.db.select().from(organizations)).length).toBe(1);
    await expect(verifyStaffLink(conn.db, token)).rejects.toMatchObject({ code: "link_unavailable" });
    const renewedToken = new URL(renewed!).searchParams.get("token")!;
    expect((await verifyStaffLink(conn.db, renewedToken)).redirect).toBe("/admin");
    await expect(verifyStaffLink(conn.db, renewedToken)).rejects.toMatchObject({ code: "link_unavailable" });
    await expect(verifyStaffLink(conn.db, token)).rejects.toMatchObject({ code: "link_unavailable" });
    const expired = await bootstrapAdmin(conn.db, "expired@example.invalid", "Synthetic Expired", "superadmin", true, new Date(+now - 901_000));
    await expect(verifyStaffLink(conn.db, new URL(expired!).searchParams.get("token")!)).rejects.toMatchObject({ code: "link_unavailable" });
    expect((await conn.db.select().from(emailOutbox)).length).toBe(0); expect(fetch).not.toHaveBeenCalled();
  } finally { await conn.close(); }
// Includes a cold PGlite/WASM startup alongside the other database suites.
}, 30000);
test("production cultural seed publishes verified sources only and carries no demo identities", async () => {
  const conn = await connectDatabase({ memory: true });
  try {
    await migrateDatabase(conn.db);
    await seedDatabase(conn.db, [{ url: seedEntries[0].url, finalUrl: seedEntries[0].url, checkedAt: new Date().toISOString(), status: 200, verified: true }], { production: true });
    const rows = await conn.db.select().from(culturalItems);
    expect(rows.length).toBe(24); expect(rows.every(row => !row.demo)).toBe(true);
    expect(rows.filter(row => row.status === "published").length).toBe(2);
    expect(rows.filter(row => row.status === "needs_source").length).toBe(22);
  } finally { await conn.close(); }
});
