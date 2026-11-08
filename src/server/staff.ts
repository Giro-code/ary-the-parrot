import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { decrypt, emailHash, encrypt, normalizeEmail, requirePrivacyKeys } from "./crypto.ts";
import { hashToken, newToken } from "./tokens.ts";
import { AppError } from "./errors.ts";
import { rateLimit } from "./service.ts";
import { dispatchImmediate, enqueueEmail } from "./email/outbox.ts";
import { baseUrl } from "./config.ts";

export const roles = ["superadmin", "operator", "provider_admin", "provider_editor", "analyst"] as const;
export type Role = typeof roles[number];
export const operators: Role[] = ["superadmin", "operator"];
export const readers: Role[] = [...operators, "analyst"];
export const partners: Role[] = ["provider_admin", "provider_editor"];
export type Staff = { userId: string; organizationId: string; role: Role };
export async function audit(db: Database, staff: Staff | null, action: string, targetType: string, targetId?: string, metadata?: Record<string, unknown>) {
  await db.insert(s.auditLogs).values({ actor: staff?.userId, organizationId: staff?.organizationId, action, targetType, targetId, metadata });
}
export async function requireStaff({ db, token, roles: allowed, organizationId }: { db: Database; token?: string; roles: readonly Role[]; organizationId?: string }): Promise<Staff> {
  if (!token || !/^[\w-]{43}$/.test(token)) throw new AppError("staff_required", 401);
  const rows = await db.select({ userId: s.staffSessions.userId, organizationId: s.memberships.organizationId, role: s.memberships.role }).from(s.staffSessions)
    .innerJoin(s.memberships, eq(s.memberships.userId, s.staffSessions.userId)).innerJoin(s.organizations, eq(s.organizations.id, s.memberships.organizationId))
    .where(and(eq(s.staffSessions.tokenHash, hashToken(token)), gt(s.staffSessions.expiresAt, new Date()), eq(s.memberships.status, "active"), eq(s.organizations.status, "active"), organizationId ? eq(s.memberships.organizationId, organizationId) : undefined));
  if (!rows.length) throw new AppError("staff_forbidden", 403);
  const match = rows.find(row => allowed.includes(row.role as Role));
  if (!match) throw new AppError("staff_forbidden", 403);
  return match as Staff;
}
export async function staffMemberships(db: Database, staff: Staff) {
  return db.select({ organizationId: s.organizations.id, name: s.organizations.name, role: s.memberships.role }).from(s.memberships)
    .innerJoin(s.organizations, eq(s.organizations.id, s.memberships.organizationId)).where(and(eq(s.memberships.userId, staff.userId), eq(s.memberships.status, "active"), eq(s.organizations.status, "active")));
}
export async function createMembership(db: Database, email: string, organizationId: string, role: Role, status = "active") {
  requirePrivacyKeys();
  const [account] = await db.insert(s.visitorAccounts).values({ emailLookupHash: emailHash(email), emailEncrypted: encrypt(normalizeEmail(email)) }).onConflictDoUpdate({ target: s.visitorAccounts.emailLookupHash, set: { emailEncrypted: encrypt(normalizeEmail(email)) } }).returning();
  const [member] = await db.insert(s.memberships).values({ userId: account.id, organizationId, role, status }).onConflictDoUpdate({ target: [s.memberships.userId, s.memberships.organizationId], set: { role, status } }).returning();
  return member;
}
export const staffLoginResult = { accepted: true, message: "Si tienes una membresía activa recibirás un enlace de acceso. En modo prueba consulta /dev/outbox; no se envía correo." };
export async function requestStaffLink(db: Database, email: string, clientKey: string) {
  requirePrivacyKeys();
  const lookup = emailHash(email);
  await rateLimit(db, clientKey, 10, new Date(), 900_000);
  await rateLimit(db, hashToken(`staff-email:${lookup}`), 3, new Date(), 900_000);
  const [member] = await db.select({ userId: s.visitorAccounts.id, email: s.visitorAccounts.emailEncrypted }).from(s.visitorAccounts)
    .innerJoin(s.memberships, eq(s.memberships.userId, s.visitorAccounts.id)).innerJoin(s.organizations, eq(s.organizations.id, s.memberships.organizationId))
    .where(and(eq(s.visitorAccounts.emailLookupHash, lookup), eq(s.memberships.status, "active"), eq(s.organizations.status, "active"))).limit(1);
  if (member?.email) {
    const id = await db.transaction(async tx => {
      const token = newToken();
      const [link] = await tx.insert(s.authMagicLinks).values({ purpose: "staff_login", userId: member.userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 900_000) }).returning();
      return enqueueEmail(tx, { template: "staff_login", to: decrypt(member.email!), locale: "es", idempotencyKey: `staff:${link.id}`, data: { url: `${baseUrl()}/admin/entrar?token=${token}` } });
    });
    await dispatchImmediate(db, [id]);
  }
  return staffLoginResult;
}
export async function verifyStaffLink(db: Database, token: string, oldToken?: string, now = new Date()) {
  return db.transaction(async tx => {
    const [link] = await tx.update(s.authMagicLinks).set({ usedAt: now }).where(and(eq(s.authMagicLinks.tokenHash, hashToken(token)), isNull(s.authMagicLinks.usedAt), gt(s.authMagicLinks.expiresAt, now), eq(s.authMagicLinks.purpose, "staff_login"))).returning();
    const [invitation] = !link ? await tx.update(s.authMagicLinks).set({ usedAt: now }).where(and(eq(s.authMagicLinks.tokenHash, hashToken(token)), isNull(s.authMagicLinks.usedAt), gt(s.authMagicLinks.expiresAt, now), eq(s.authMagicLinks.purpose, "staff_invite"))).returning() : [];
    const accessLink = link || invitation;
    if (!accessLink?.userId) throw new AppError("link_unavailable", 400);
    if (accessLink.purpose === "staff_invite" && accessLink.organizationId) await tx.update(s.memberships).set({ status: "active" }).where(and(eq(s.memberships.userId, accessLink.userId), eq(s.memberships.organizationId, accessLink.organizationId), eq(s.memberships.status, "invited")));
    const [member] = await tx.select().from(s.memberships).innerJoin(s.organizations, eq(s.memberships.organizationId, s.organizations.id)).where(and(eq(s.memberships.userId, accessLink.userId), eq(s.memberships.status, "active"), eq(s.organizations.status, "active"))).limit(1);
    if (!member) throw new AppError("link_unavailable", 400);
    if (oldToken) await tx.delete(s.staffSessions).where(eq(s.staffSessions.tokenHash, hashToken(oldToken)));
    const fresh = newToken();
    await tx.insert(s.staffSessions).values({ tokenHash: hashToken(fresh), userId: accessLink.userId, expiresAt: new Date(+now + 8 * 3600_000) });
    await tx.update(s.visitorAccounts).set({ lastActiveAt: now }).where(eq(s.visitorAccounts.id, accessLink.userId));
    const staff = { userId: accessLink.userId, organizationId: member.memberships.organizationId, role: member.memberships.role as Role };
    await audit(tx, staff, "staff.login", "staff_session");
    return { token: fresh, redirect: partners.includes(staff.role) ? "/partner" : "/admin" };
  });
}
export async function inviteMember(db: Database, staff: Staff, email: string, organizationId: string, role: Role) {
  return db.transaction(async tx => {
    const member = await createMembership(tx, email, organizationId, role, "invited"), token = newToken();
    const [link] = await tx.insert(s.authMagicLinks).values({ userId: member.userId, organizationId, purpose: "staff_invite", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 900_000) }).returning();
    const id = await enqueueEmail(tx, { template: "staff_login", locale: "es", to: email, idempotencyKey: `invite:${link.id}`, data: { url: `${baseUrl()}/admin/entrar?token=${token}` } });
    await audit(tx, staff, "membership.invite", "membership", member.id, { role, organizationId });
    return id;
  });
}
