import { AppError } from "./errors.ts";
export const minimumSecretLength = 32;
export const validSecret = (value: string | undefined) => !!value && value.trim().length >= minimumSecretLength;
export function parseBaseUrl(raw: string, production: boolean) {
  const url = new URL(raw);
  if (production && url.protocol !== "https:") throw new AppError("invalid_base_url", 503);
  return url;
}
export function numericEnv(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? Math.min(value, maximum) : fallback;
}
export const sessionTtl = () => numericEnv("VISITOR_SESSION_TTL_HOURS", 24, 168) * 3600_000;
export const handoffTtl = () => numericEnv("QR_HANDOFF_TTL_SECONDS", 120, 300) * 1000;
export function baseUrl() {
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw && process.env.NODE_ENV === "production") throw new AppError("base_url_not_configured", 503);
  const url = parseBaseUrl(raw || "http://localhost:3000", process.env.NODE_ENV === "production");
  return url.origin;
}

export const generatedSecrets = ["AUTH_SECRET", "SESSION_ENCRYPTION_KEY", "CRON_SECRET", "RATE_LIMIT_SALT", "ROBOT_DEVICE_AUTH_SECRET", "ROBOT_BRIDGE_SECRET"] as const;
export const ownerVariables = ["DATABASE_URL", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "EMAIL_FROM", "EMAIL_REPLY_TO", "ADMIN_NOTIFICATION_EMAIL", "GEMINI_API_KEY"] as const;
export const secretVariables = [...generatedSecrets, "DATABASE_URL", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "GEMINI_API_KEY"] as const;
export const productionDefaults: Record<string, string> = {
  APP_BASE_URL: "https://arytheparrot.app", EMAIL_DRY_RUN: "true", AI_MODEL: "gemini-3.8-flash",
  AI_SESSION_PER_MINUTE: "6", AI_GLOBAL_PER_MINUTE: "30", ANALYTICS_RETENTION_DAYS: "90",
  PROVIDER_LEAD_RETENTION_DAYS: "30", VISITOR_SESSION_TTL_HOURS: "24", QR_HANDOFF_TTL_SECONDS: "120",
  FEATURE_ENABLE_MARKETING: "false", FEATURE_ENABLE_PARTNER_SHARING: "false",
};
export type ConfigCheck = { name: string; status: "OK" | "falta" | "formato inválido"; required: boolean };
export function validateProductionConfig(env: Record<string, string | undefined>): ConfigCheck[] {
  const rows: ConfigCheck[] = [];
  const check = (name: string, valid: (value: string) => boolean, required = true) => {
    const value = env[name]?.trim();
    let ok = false;
    try { ok = !!value && valid(value); } catch { /* Values and parser errors stay private. */ }
    rows.push({ name, status: !value ? "falta" : ok ? "OK" : "formato inválido", required });
  };
  check("APP_BASE_URL", value => {
    const url = parseBaseUrl(value, true);
    return url.hostname === "arytheparrot.app" && url.origin === value && !url.username && !url.password;
  });
  check("DATABASE_URL", value => {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) && !!url.hostname && !!url.username && !!url.password && url.pathname.length > 1
      && ["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") || "");
  });
  for (const name of generatedSecrets) check(name, value => validSecret(value)
    && (!(name === "ROBOT_DEVICE_AUTH_SECRET" || name === "ROBOT_BRIDGE_SECRET") || env.ROBOT_DEVICE_AUTH_SECRET !== env.ROBOT_BRIDGE_SECRET));
  check("EMAIL_DRY_RUN", value => ["true", "false"].includes(value));
  const mailRequired = env.EMAIL_DRY_RUN === "false";
  check("RESEND_API_KEY", value => /^re_[\w-]+$/.test(value), mailRequired);
  check("RESEND_WEBHOOK_SECRET", value => /^whsec_[A-Za-z0-9+/]+={0,2}$/.test(value), mailRequired);
  const email = (value: string) => /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
  check("EMAIL_FROM", value => email(value) || /^[^<>\r\n]+<[^<>]+>$/.test(value) && email(value.slice(value.indexOf("<") + 1, -1)), mailRequired);
  check("EMAIL_REPLY_TO", email, false);
  check("ADMIN_NOTIFICATION_EMAIL", email, false);
  check("GEMINI_API_KEY", value => value.length >= 20);
  check("AI_MODEL", value => /^[\w.-]+$/.test(value));
  for (const name of ["FEATURE_ENABLE_MARKETING", "FEATURE_ENABLE_PARTNER_SHARING"]) check(name, value => ["true", "false"].includes(value));
  for (const [name, max] of Object.entries({ AI_SESSION_PER_MINUTE: 20, AI_GLOBAL_PER_MINUTE: 120, ANALYTICS_RETENTION_DAYS: 365, PROVIDER_LEAD_RETENTION_DAYS: 90, VISITOR_SESSION_TTL_HOURS: 168, QR_HANDOFF_TTL_SECONDS: 300 })) {
    check(name, value => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= max);
  }
  return rows;
}
