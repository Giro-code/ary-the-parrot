import { afterEach, expect, test, vi } from "vitest";
import { GET } from "../../app/api/health/route";
import { version } from "../../package.json";

afterEach(() => vi.unstubAllEnvs());

test("health informa los modos seguros por defecto y no se almacena en caché", async () => {
  for (const key of ["DATABASE_URL", "EMAIL_DRY_RUN", "RESEND_API_KEY", "EMAIL_FROM", "AI_GATEWAY_API_KEY", "AI_MODEL"]) {
    vi.stubEnv(key, "");
  }
  const response = GET();
  const health = await response.json();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(health).toEqual({
    status: "ok", version, time: expect.any(String),
    checks: { database: "not_configured", email: "dry_run", ai: "demo", robot: "simulator" },
  });
  expect(Number.isNaN(Date.parse(health.time))).toBe(false);
});

test("health solo expone estados de configuración y nunca valores del entorno", async () => {
  const variables = ["DATABASE_URL", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO", "AUTH_SECRET", "SESSION_ENCRYPTION_KEY", "CRON_SECRET", "AI_GATEWAY_API_KEY", "GEMINI_API_KEY", "AI_MODEL", "ROBOT_DEVICE_AUTH_SECRET", "APP_BASE_URL", "VERSION"];
  variables.forEach((key) => vi.stubEnv(key, `private-test-${key}`));
  vi.stubEnv("EMAIL_DRY_RUN", "false");
  vi.stubEnv("ROBOT_MODE", "hardware");
  const text = await GET().text();
  variables.forEach((key) => expect(text).not.toContain(`private-test-${key}`));
  expect(JSON.parse(text).checks).toEqual({
    database: "configured_unverified", email: "configured_unverified", ai: "configured_unverified", robot: "simulator",
  });
  expect(JSON.parse(text).version).toBe(version);
});

test("correo sin remitente o clave queda sin configurar y dry-run tiene prioridad", async () => {
  vi.stubEnv("EMAIL_DRY_RUN", "false");
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("EMAIL_FROM", " ");
  expect((await GET().json()).checks.email).toBe("not_configured");
  vi.stubEnv("EMAIL_FROM", "Ary <test@example.invalid>");
  vi.stubEnv("RESEND_API_KEY", "");
  expect((await GET().json()).checks.email).toBe("not_configured");
  vi.stubEnv("EMAIL_DRY_RUN", "true");
  expect((await GET().json()).checks.email).toBe("dry_run");
});
