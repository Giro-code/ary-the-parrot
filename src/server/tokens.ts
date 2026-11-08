import { createHash, randomBytes, randomInt, createHmac } from "node:crypto";
import { AppError } from "./errors.ts";
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
export const confirmationCode = () => String(randomInt(0, 100)).padStart(2, "0");
export function clientHash(client: string) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.AUTH_SECRET;
  if (!salt && process.env.NODE_ENV === "production") throw new AppError("rate_limit_not_configured", 503);
  return createHmac("sha256", salt || "ary-local-development-only").update(client).digest("hex");
}
