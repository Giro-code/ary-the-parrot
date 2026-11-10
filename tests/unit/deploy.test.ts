import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { generateSecrets } from "../../scripts/deploy-secrets";
import { checkDeployment, runDeployCheck } from "../../scripts/deploy-check";
import { assertDemoAllowed, loadCliEnv } from "../../scripts/cli-env";
import { generatedSecrets, ownerVariables, secretVariables, validateProductionConfig } from "../../src/server/config";

let root: string;
beforeEach(() => {
  mkdirSync(".cache", { recursive: true }); root = mkdtempSync(join(process.cwd(), ".cache", "deploy-test-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ engines: { node: "24.x" } }));
  writeFileSync(join(root, "vercel.json"), readFileSync("vercel.json"));
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(root, { recursive: true, force: true }); });
function synthetic(): Record<string, string> {
  const file = join(root, ".env.production.local"); generateSecrets(file, false, () => {});
  return { ...parseEnv(readFileSync(file, "utf8")), DATABASE_URL: `postgresql://synthetic:${randomBytes(24).toString("hex")}@ep-unit-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`,
    RESEND_API_KEY: `re_${randomBytes(24).toString("hex")}`, RESEND_WEBHOOK_SECRET: `whsec_${randomBytes(24).toString("base64")}`, EMAIL_FROM: "Ary <staff@example.invalid>", EMAIL_REPLY_TO: "reply@example.invalid", ADMIN_NOTIFICATION_EMAIL: "admin@example.invalid", GEMINI_API_KEY: randomBytes(32).toString("base64url") };
}
function saveEnv(env: Record<string, string | undefined>) { writeFileSync(join(root, "synthetic.env"), Object.entries(env).map(([key, value]) => `${key}=${value ?? ""}`).join("\n")); }
function privateOutput(logs: string[], env: Record<string, string | undefined>) {
  // Boolean assertions prevent even a failing test from rendering a credential.
  expect(secretVariables.some(key => !!env[key] && logs.join("\n").includes(env[key]!))).toBe(false);
}
test("secrets: strong independent keys, safe defaults, owner blanks and no value output", () => {
  const logs: string[] = [], file = join(root, ".env.production.local");
  expect(generateSecrets(file, false, line => logs.push(line))).toBe(true);
  const env = parseEnv(readFileSync(file, "utf8"));
  expect(generatedSecrets.every(key => /^[\w-]{64}$/.test(env[key]!))).toBe(true);
  expect(new Set(generatedSecrets.map(key => env[key])).size).toBe(6);
  expect(ownerVariables.every(key => env[key] === "")).toBe(true);
  expect(env.EMAIL_DRY_RUN === "true" && env.FEATURE_ENABLE_MARKETING === "false" && env.APP_BASE_URL === "https://arytheparrot.app").toBe(true);
  privateOutput(logs, env);
});
test("secrets: refuses overwrite; force preserves previous bytes in private backup", () => {
  const file = join(root, ".env.production.local"), logs: string[] = [];
  generateSecrets(file, false, line => logs.push(line)); const original = readFileSync(file);
  expect(generateSecrets(file, false, line => logs.push(line))).toBe(false);
  expect(readFileSync(file).equals(original)).toBe(true);
  expect(generateSecrets(file, true, line => logs.push(line))).toBe(true);
  const backup = readdirSync(root).find(name => name.startsWith(".env.production.local.bak."))!;
  expect(readFileSync(join(root, backup)).equals(original)).toBe(true);
  expect(readFileSync(file).equals(original)).toBe(false);
  privateOutput(logs, parseEnv(original.toString())); privateOutput(logs, parseEnv(readFileSync(file, "utf8")));
});
test("check: valid synthetic file passes without providers or private output", () => {
  const env = synthetic(), logs: string[] = []; saveEnv(env);
  expect(runDeployCheck(["--env-file", "synthetic.env"], root, line => logs.push(line))).toBe(0);
  expect(logs.some(line => line.includes("Sin build"))).toBe(true); privateOutput(logs, env);
});
test("check: missing, short, HTTP, wrong host, insecure database and equal robot secrets fail", () => {
  const env = synthetic();
  for (const delta of [{ AUTH_SECRET: "short" }, { CRON_SECRET: "" }, { APP_BASE_URL: "http://arytheparrot.app" }, { APP_BASE_URL: "https://other.example.invalid" }, { DATABASE_URL: env.DATABASE_URL.replace("sslmode=require", "sslmode=disable") }, { ROBOT_BRIDGE_SECRET: env.ROBOT_DEVICE_AUTH_SECRET }]) {
    const logs: string[] = [], bad = { ...env, ...delta }; saveEnv(bad);
    expect(runDeployCheck(["--env-file", "synthetic.env"], root, line => logs.push(line))).toBe(1); privateOutput(logs, bad);
  }
});
test("check: dry-run permits absent Resend; live mail requires valid sender and keys", () => {
  const env = synthetic(); env.RESEND_API_KEY = ""; env.RESEND_WEBHOOK_SECRET = ""; env.EMAIL_FROM = "";
  expect(validateProductionConfig(env).some(row => row.required && row.status !== "OK")).toBe(false);
  env.EMAIL_DRY_RUN = "false";
  expect(validateProductionConfig(env).filter(row => row.required && row.status === "falta").length).toBe(3);
});
test("check: finds public aliases, nested literals, binary secrets and SHA-256 footprints without echo", () => {
  const env = synthetic(); mkdirSync(join(root, "public")); mkdirSync(join(root, ".next/static"), { recursive: true });
  writeFileSync(join(root, "public", "exposed.bin"), Buffer.concat([Buffer.from([0, 1]), Buffer.from(env.AUTH_SECRET)]));
  writeFileSync(join(root, ".next/static", "bundle.js"), `const privateValue="${createHash("sha256").update(env.GEMINI_API_KEY).digest("hex")}";`);
  saveEnv({ ...env, NEXT_PUBLIC_ALIAS: env.ROBOT_BRIDGE_SECRET, NEXT_PUBLIC_API_KEY: "placeholder" });
  const logs: string[] = []; expect(runDeployCheck(["--env-file", "synthetic.env"], root, line => logs.push(line))).toBe(1);
  expect(logs.some(line => line.includes("public: AUTH_SECRET"))).toBe(true);
  expect(logs.some(line => line.includes(".next/static: GEMINI_API_KEY"))).toBe(true);
  expect(logs.some(line => line.includes("NEXT_PUBLIC_ALIAS | formato inválido"))).toBe(true); privateOutput(logs, env);
});
test("check: rejects hourly crons, unsupported Node and missing env with sanitized errors", () => {
  const env = synthetic();
  writeFileSync(join(root, "package.json"), JSON.stringify({ engines: { node: "26.x" } }));
  writeFileSync(join(root, "vercel.json"), JSON.stringify({ crons: [{ path: "/api/internal/email-dispatch", schedule: "0 * * * *" }] }));
  const rows = checkDeployment(env, root); expect(rows.filter(row => row.status !== "OK").length).toBe(3);
  const logs: string[] = []; expect(runDeployCheck(["--env-file", "absent"], root, line => logs.push(line))).toBe(1); privateOutput(logs, env);
});
test("explicit env is authoritative and demo guards execute before database connection", () => {
  const env = synthetic(); saveEnv(env);
  for (const key of [...Object.keys(env), "NODE_ENV", "PGLITE_DATA_DIR"]) vi.stubEnv(key, "");
  loadCliEnv(["--env-file", join(root, "synthetic.env")]);
  expect(process.env.NODE_ENV === "production" && process.env.DATABASE_URL === env.DATABASE_URL).toBe(true);
  expect(() => assertDemoAllowed([])).toThrow("Production demo blocked");
  expect(() => assertDemoAllowed(["--i-know-this-is-production-demo"])).not.toThrow();
  expect(() => assertDemoAllowed([], { APP_BASE_URL: "http://localhost:3000", NODE_ENV: "development" })).not.toThrow();
  expect(() => assertDemoAllowed([], { APP_BASE_URL: "https://arytheparrot.app", NODE_ENV: "development" })).toThrow();
  writeFileSync(join(root, "missing-origin.env"), "DATABASE_URL=\n");
  expect(() => loadCliEnv(["--env-file", join(root, "missing-origin.env")])).toThrow("Explicit env requires APP_BASE_URL");
});
