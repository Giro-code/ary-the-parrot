import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import type { Session } from "./service.ts";
import { encrypt, decrypt } from "./crypto.ts";
import { AppError } from "./errors.ts";
import { hasConsent } from "./consents.ts";
export const placeSchema = z.object({ name: z.string().trim().min(1).max(160).refine(value => !/https?:|www\.|<|>/.test(value)) }).strict();
const owner = (session: Session) => session.ownerUserId ? eq(s.savedPlaces.visitorId, session.ownerUserId) : eq(s.savedPlaces.sessionId, session.id);
export function requestedDestination(text: string) {
  const name = text.replace(/^[¿?\s]*/, "").replace(/^(?:c[oó]mo (?:llego|llegar|voy|ir)(?: a)?|d[oó]nde (?:queda|est[aá]n?)|quiero ir(?: a)?|how (?:do i |can i )?(?:get|go|reach)(?: to)?|where (?:is|are)|i (?:want|would like) to (?:go|visit)(?: to)?|directions to|take me to)\s*/i, "").replace(/[?¿!]+$/g, "").trim();
  return placeSchema.safeParse({ name }).success ? name : undefined;
}
export async function listPlaces(db: Database, session: Session) {
  const rows = await db.select().from(s.savedPlaces).where(owner(session)).orderBy(s.savedPlaces.createdAt).limit(100);
  return rows.flatMap(({ encryptedPayload, id, createdAt }) => { try { return [{ id, createdAt, ...placeSchema.parse(JSON.parse(decrypt(encryptedPayload))) }]; } catch { return []; } });
}
export async function savePlace(db: Database, session: Session, raw: unknown) {
  const parsed = placeSchema.safeParse(raw); if (!parsed.success) throw new AppError("invalid_body", 400);
  if (session.ownerUserId && !await hasConsent(db, session.ownerUserId, "service_storage")) throw new AppError("storage_consent_required", 403);
  const current = await listPlaces(db, session), existing = current.find(row => row.name.toLowerCase() === parsed.data.name.toLowerCase());
  if (existing) return existing;
  if (current.length >= 100) throw new AppError("trip_limit_reached", 409);
  const [row] = await db.insert(s.savedPlaces).values({ sessionId: session.ownerUserId ? null : session.id, visitorId: session.ownerUserId, encryptedPayload: encrypt(JSON.stringify(parsed.data)) }).returning();
  return { id: row.id, name: parsed.data.name, createdAt: row.createdAt };
}
export async function deletePlace(db: Database, session: Session, id: string) {
  await db.delete(s.savedPlaces).where(and(eq(s.savedPlaces.id, id), owner(session))); return { deleted: true };
}
