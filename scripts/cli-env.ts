import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { generatedSecrets, ownerVariables, productionDefaults } from "../src/server/config.ts";

export function option(args: string[], name: string) {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error("Missing option value");
  return value;
}
export function localBaseUrl(value: string | undefined) {
  try {
    const url = new URL(value || "http://localhost:3000");
    return ["http:", "https:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch { return false; }
}
export function assertDemoAllowed(args: string[], env: Record<string, string | undefined> = process.env) {
  if ((env.NODE_ENV === "production" || !localBaseUrl(env.APP_BASE_URL)) && !args.includes("--i-know-this-is-production-demo")) {
    throw new Error("Production demo blocked");
  }
}
export function loadCliEnv(args = process.argv.slice(3)) {
  const filename = option(args, "env-file");
  if (filename) {
    // Explicit file is authoritative. Never fall back to a developer's credentials.
    const values = parseEnv(readFileSync(filename, "utf8"));
    if (!values.APP_BASE_URL?.trim()) throw new Error("Explicit env requires APP_BASE_URL");
    for (const key of [...generatedSecrets, ...ownerVariables, ...Object.keys(productionDefaults), "PGLITE_DATA_DIR"]) delete process.env[key];
    Object.assign(process.env, values);
  } else nextEnv.loadEnvConfig(process.cwd(), undefined, { info() {}, error() {} });
  if (!localBaseUrl(process.env.APP_BASE_URL)) Object.assign(process.env, { NODE_ENV: "production" });
}
