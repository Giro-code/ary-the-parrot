import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "./errors.ts";
import { validSecret } from "./config.ts";

// Explicitly labelled deterministic test/development keys; never a production fallback.
function secret(name: "AUTH_SECRET" | "SESSION_ENCRYPTION_KEY") {
  const value = process.env[name];
  if (process.env.NODE_ENV === "production" && !validSecret(value)) throw new AppError("privacy_keys_not_configured", 503);
  return value || `ARY-DEVELOPMENT-TEST-KEY-ONLY:${name}`;
}
export function requirePrivacyKeys() { secret("AUTH_SECRET"); secret("SESSION_ENCRYPTION_KEY"); }
export function normalizeEmail(value: string) {
  const email = value.trim(), at = email.lastIndexOf("@");
  return email.slice(0, at) + "@" + email.slice(at + 1).toLowerCase();
}
export const emailHash = (email: string) => createHmac("sha256", secret("AUTH_SECRET")).update(normalizeEmail(email)).digest("hex");
export const privateHash = (value: string) => createHmac("sha256", secret("AUTH_SECRET")).update(value).digest("hex");
export function encrypt(value: string) {
  const key = createHash("sha256").update(secret("SESSION_ENCRYPTION_KEY")).digest();
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("ary:pii:v1"));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decrypt(value: string) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Invalid encrypted payload");
  const cipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret("SESSION_ENCRYPTION_KEY")).digest(), Buffer.from(iv, "base64url"));
  cipher.setAAD(Buffer.from("ary:pii:v1")); cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([cipher.update(Buffer.from(ciphertext, "base64url")), cipher.final()]).toString("utf8");
}
export function constantEqual(a: string, b: string) {
  // Hash both sides to equal-length buffers before timingSafeEqual.
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
