import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { constantEqual } from "./crypto.ts";
import { AppError } from "./errors.ts";
import { baseUrl, validSecret } from "./config.ts";
import { hashToken } from "./tokens.ts";
import { rateLimit } from "./service.ts";
import { robotStates } from "../robot/protocol.ts";

export function robotSecret() {
  const secret = process.env.ROBOT_DEVICE_AUTH_SECRET?.trim();
  if (!secret || !validSecret(secret)) throw new AppError("robot_not_configured", 503);
  return secret;
}
export function bridgeToken(deviceId: string, now = Math.floor(Date.now() / 1000)) {
  const secret = process.env.ROBOT_BRIDGE_SECRET?.trim();
  if (!secret || !validSecret(secret)) throw new AppError("bridge_not_configured", 503);
  const payload = Buffer.from(JSON.stringify({ aud: "ary-bridge", deviceId, origin: baseUrl(), iat: now, exp: now + 120, jti: randomUUID() })).toString("base64url");
  return { token: `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`, expiresAt: (now + 120) * 1000 };
}
export function signingMessage(method: string, path: string, deviceId: string, timestamp: string, nonce: string, raw: string) {
  return [method, path, deviceId, timestamp, nonce, createHash("sha256").update(raw).digest("hex")].join("\n");
}
export async function authenticateRobot(db: Database, request: NextRequest, raw = "", now = Date.now()) {
  const secret = robotSecret();
  const deviceId = request.headers.get("x-ary-device") || "", timestamp = request.headers.get("x-ary-timestamp") || "";
  const nonce = request.headers.get("x-ary-nonce") || "", signature = request.headers.get("x-ary-signature") || "";
  if (!z.uuid().safeParse(deviceId).success || !/^\d{10}$/.test(timestamp) || Math.abs(now - Number(timestamp) * 1000) > 60_000 || !/^[\w-]{16,100}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature) || request.nextUrl.search) throw new AppError("robot_unauthorized", 401);
  const expected = createHmac("sha256", secret).update(signingMessage(request.method, request.nextUrl.pathname, deviceId, timestamp, nonce, raw)).digest("hex");
  if (!constantEqual(signature, expected)) throw new AppError("robot_unauthorized", 401);
  const [device] = await db.select().from(s.kioskDevices).where(and(eq(s.kioskDevices.publicDeviceId, deviceId), gt(s.kioskDevices.credentialExpiresAt, new Date(now))));
  if (!device || !["active", "maintenance"].includes(device.status)) throw new AppError("robot_unauthorized", 401);
  const [claimed] = await db.insert(s.rateLimits).values({ keyHash: hashToken(`robot-nonce:${deviceId}:${nonce}`), count: 1, resetAt: new Date(now + 180_000) }).onConflictDoNothing().returning();
  if (!claimed) throw new AppError("robot_replay", 409);
  await rateLimit(db, hashToken(`robot:${deviceId}`), 120);
  return device;
}
export const robotEventSchema = z.object({ eventId: z.uuid(), state: z.enum(robotStates), hardware: z.enum(["ok", "simulated", "error"]), firmwareVersion: z.string().regex(/^[\w.-]{1,40}$/).optional() }).strict();
export async function acceptRobotEvent(db: Database, device: typeof s.kioskDevices.$inferSelect, data: z.infer<typeof robotEventSchema>) {
  return db.transaction(async tx => {
    const payloadHash = hashToken(JSON.stringify(data));
    const [row] = await tx.insert(s.robotEvents).values({ eventId: data.eventId, deviceId: device.id, state: data.state, hardware: data.hardware, payloadHash }).onConflictDoNothing().returning();
    if (!row) {
      const [previous] = await tx.select().from(s.robotEvents).where(eq(s.robotEvents.eventId, data.eventId));
      if (previous.deviceId !== device.id || previous.payloadHash !== payloadHash) throw new AppError("robot_event_conflict", 409);
      return { accepted: true, duplicate: true };
    }
    await tx.update(s.kioskDevices).set({ lastSeenAt: new Date(), firmwareVersion: data.firmwareVersion || device.firmwareVersion }).where(eq(s.kioskDevices.id, device.id));
    return { accepted: true, duplicate: false };
  });
}
export async function nextMaintenanceCommand(db: Database, deviceId: string) {
  return db.transaction(async tx => {
    const [row] = await tx.select().from(s.robotCommands).where(and(eq(s.robotCommands.deviceId, deviceId), isNull(s.robotCommands.deliveredAt), gt(s.robotCommands.expiresAt, new Date()))).orderBy(s.robotCommands.createdAt).limit(1).for("update", { skipLocked: true });
    if (!row) return null;
    await tx.update(s.robotCommands).set({ deliveredAt: new Date() }).where(eq(s.robotCommands.id, row.id));
    // A second gate protects legacy/corrupt DB rows. Only maintenance gestures cross this channel.
    if (row.state !== "maintenance" || !["rest", "stop"].includes(row.gesture)) return null;
    return { id: row.id, state: "maintenance", gesture: row.gesture };
  });
}
