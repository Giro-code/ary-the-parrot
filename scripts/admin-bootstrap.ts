import type { Database } from "../src/db/client.ts";
import { audit, createMembership, type Role } from "../src/server/staff.ts";
import { authMagicLinks, organizations } from "../src/db/schema.ts";
import { hashToken, newToken } from "../src/server/tokens.ts";
import { baseUrl } from "../src/server/config.ts";
import { and, eq } from "drizzle-orm";

// CLI-only: never import from a route. The caller controls local terminal disclosure.
export async function bootstrapAdmin(db: Database, email: string, name: string, role: Role, issueLink: boolean, now = new Date()) {
  const origin = issueLink ? baseUrl() : "";
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(organizations).where(and(eq(organizations.name, name), eq(organizations.kind, "admin"))).limit(1);
    const org = existing || (await tx.insert(organizations).values({ name, kind: "admin" }).returning())[0];
    if (org.status !== "active") throw new Error("Organization inactive");
    const member = await createMembership(tx, email, org.id, role);
    const staff = { userId: member.userId, organizationId: org.id, role };
    await audit(tx, staff, "staff.bootstrap", "membership", member.id);
    if (!issueLink) return undefined;
    // Re-running the private bootstrap renews access without leaving older links valid.
    await tx.update(authMagicLinks).set({ usedAt: now }).where(and(eq(authMagicLinks.userId, member.userId), eq(authMagicLinks.purpose, "staff_login")));
    const token = newToken();
    await tx.insert(authMagicLinks).values({ purpose: "staff_login", userId: member.userId, tokenHash: hashToken(token), expiresAt: new Date(+now + 900_000) });
    await audit(tx, staff, "staff.bootstrap.local_link", "membership", member.id);
    return `${origin}/admin/entrar?token=${token}`;
  });
}
