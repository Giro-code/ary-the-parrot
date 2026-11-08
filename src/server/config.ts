import { AppError } from "./errors.ts";
export function numericEnv(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? Math.min(value, maximum) : fallback;
}
export const sessionTtl = () => numericEnv("VISITOR_SESSION_TTL_HOURS", 24, 168) * 3600_000;
export const handoffTtl = () => numericEnv("QR_HANDOFF_TTL_SECONDS", 120, 300) * 1000;
export function baseUrl() {
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw && process.env.NODE_ENV === "production") throw new AppError("base_url_not_configured", 503);
  const url = new URL(raw || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new AppError("invalid_base_url", 503);
  return url.origin;
}
