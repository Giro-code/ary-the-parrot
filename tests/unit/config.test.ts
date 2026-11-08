import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import config from "../../next.config";

test("rewrite de portada precede a los archivos y conserva la URL pública", async () => {
  expect(await config.rewrites!()).toMatchObject({
    beforeFiles: [{ source: "/", destination: "/index.html" }, { source: "/favicon.ico", destination: "/site/favicon.svg" }],
    afterFiles: [], fallback: [],
  });
});

test("cabeceras globales compatibles con recursos originales", async () => {
  const rules = await config.headers!();
  expect(rules[0].source).toBe("/:path*");
  const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));
  expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  expect(headers["Content-Security-Policy"]).toContain("img-src 'self' data: blob:");
  expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  expect(config.poweredByHeader).toBe(false);
  expect(config.typescript?.ignoreBuildErrors).not.toBe(true);
});

test("favicon reutiliza literalmente el símbolo original de Ary", () => {
  const original = readFileSync("legacy/index.html", "utf8");
  const symbol = original.match(/<symbol id="ary-mark" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/)!;
  expect(readFileSync("public/site/favicon.svg", "utf8").trim()).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol[1]}">${symbol[2]}</svg>`);
});

test("ejemplo de entorno conserva correo dry-run y finalidades opt-in", () => {
  const example = readFileSync(".env.example", "utf8");
  expect(example).toContain("EMAIL_DRY_RUN=true");
  expect(example).toContain("FEATURE_ENABLE_MARKETING=false");
  expect(example).toContain("FEATURE_ENABLE_PARTNER_SHARING=false");
  expect(example).toContain("APP_BASE_URL=https://arytheparrot.app");
  for (const key of ["DATABASE_URL", "AUTH_SECRET", "SESSION_ENCRYPTION_KEY", "RESEND_API_KEY", "CRON_SECRET", "GEMINI_API_KEY", "ROBOT_DEVICE_AUTH_SECRET", "ROBOT_BRIDGE_SECRET"]) {
    expect(example.split(/\r?\n/)).toContain(`${key}=`);
  }
});
test("loopback bridge CSP is scoped to the kiosk route", async () => {
  const rules = await config.headers!();
  const global = rules[0].headers.find(header => header.key === "Content-Security-Policy")!.value;
  const kiosk = rules.find(rule => rule.source === "/kiosco")!.headers.find(header => header.key === "Content-Security-Policy")!.value;
  expect(global).not.toContain("127.0.0.1:8765"); expect(kiosk).toContain("http://127.0.0.1:8765"); expect(kiosk).toContain("ws://127.0.0.1:8765");
});
