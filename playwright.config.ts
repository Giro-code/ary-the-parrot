import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(".cache/playwright");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 4,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { browserName: "chromium", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "legacy", testMatch: "legacy-regression.spec.ts", use: { baseURL: "http://127.0.0.1:3001" } },
    { name: "app", testMatch: "legacy-regression.spec.ts", use: { baseURL: "http://127.0.0.1:3000" } },
    { name: "stage2", testMatch: "stage2.spec.ts", fullyParallel: false, use: { baseURL: "http://127.0.0.1:3002" } },
  ],
  webServer: [
    {
      command: "npm run start",
      url: "http://127.0.0.1:3000/experiencia",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { APP_BASE_URL: "http://127.0.0.1:3000", DATABASE_URL: "", EMAIL_DRY_RUN: "true", NEXT_TELEMETRY_DISABLED: "1" },
    },
    {
      command: "node scripts/legacy-server.mjs",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: "node scripts/e2e-server.ts",
      url: "http://127.0.0.1:3002/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NEXT_TELEMETRY_DISABLED: "1", EMAIL_DRY_RUN: "true" },
    },
  ],
});
