import { afterEach, expect, test, vi } from "vitest";
import { AppError } from "../../src/server/errors";
import { version } from "../../package.json";
const connection = vi.hoisted(() => ({ mode: "pglite", db: { execute: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }) } }));
vi.mock("../../src/db/client", () => ({ getConnection: vi.fn(async () => {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) throw new AppError("database_not_configured", 503);
  return connection;
}) }));
import { GET } from "../../app/api/health/route";
afterEach(() => { vi.unstubAllEnvs(); connection.mode = "pglite"; });
test("health checks local database and disables caching", async () => {
  for (const key of ["DATABASE_URL", "EMAIL_DRY_RUN", "RESEND_API_KEY", "EMAIL_FROM", "GEMINI_API_KEY", "AI_MODEL"]) vi.stubEnv(key, "");
  const response = await GET(), health = await response.json();
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(health).toEqual({ status: "ok", version, time: expect.any(String), checks: { database: "local_pglite", email: "dry_run", ai: "demo", robot: "simulator" } }); expect(connection.db.execute).toHaveBeenCalled();
});
test("production without DB returns structured 503", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DATABASE_URL", "");
  const response = await GET(); expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ status: "degraded", error: "database_not_configured", requestId: expect.any(String), checks: { database: "not_configured" } });
});
test("health never exposes secrets and robot stays simulator", async () => {
  const variables = ["DATABASE_URL", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO", "AUTH_SECRET", "SESSION_ENCRYPTION_KEY", "CRON_SECRET", "AI_GATEWAY_API_KEY", "GEMINI_API_KEY", "AI_MODEL", "ROBOT_DEVICE_AUTH_SECRET", "APP_BASE_URL"];
  variables.forEach(key => vi.stubEnv(key, `private-test-${key}`)); vi.stubEnv("EMAIL_DRY_RUN", "false"); vi.stubEnv("ROBOT_MODE", "hardware"); connection.mode = "neon";
  const text = await (await GET()).text(); variables.forEach(key => expect(text).not.toContain(`private-test-${key}`));
  expect(JSON.parse(text).checks).toEqual({ database: "connected", email: "configured_unverified", ai: "configured_unverified", robot: "simulator" });
});
test("email requires sender and key; dry run takes priority", async () => {
  vi.stubEnv("EMAIL_DRY_RUN", "false"); vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("EMAIL_FROM", " ");
  expect((await (await GET()).json()).checks.email).toBe("not_configured");
  vi.stubEnv("EMAIL_FROM", "Ary <synthetic@example.invalid>"); vi.stubEnv("RESEND_API_KEY", ""); expect((await (await GET()).json()).checks.email).toBe("not_configured");
  vi.stubEnv("EMAIL_DRY_RUN", "true"); expect((await (await GET()).json()).checks.email).toBe("dry_run");
});
