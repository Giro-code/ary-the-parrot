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
    { name: "legacy", use: { baseURL: "http://127.0.0.1:3001" } },
    { name: "app", use: { baseURL: "http://127.0.0.1:3000" } },
  ],
  webServer: [
    {
      command: "npm run start",
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { APP_BASE_URL: "http://localhost:3000", EMAIL_DRY_RUN: "true", NEXT_TELEMETRY_DISABLED: "1" },
    },
    {
      command: "node scripts/legacy-server.mjs",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: false,
      timeout: 15_000,
    },
  ],
});
