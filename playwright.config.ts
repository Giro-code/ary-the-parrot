import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/warmup.ts",
  fullyParallel: true,
  workers: 4,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { locale: "es-ES", browserName: "chromium", trace: "retain-on-failure", screenshot: "only-on-failure", launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } },
  projects: [
    { name: "stage9c", testMatch: "stage9c.spec.ts", fullyParallel: false, timeout: 60000, use: { baseURL: "http://127.0.0.1:3002" } },
    { name: "stage9b", testMatch: "stage9b.spec.ts", fullyParallel: false, timeout: 180000, use: { baseURL: "http://127.0.0.1:3002" } },
    { name: "stage9", testMatch: "stage9.spec.ts", fullyParallel: false, timeout: 60000, use: { baseURL: "http://127.0.0.1:3002" } },
    { name: "stage8", testMatch: "stage8.spec.ts", fullyParallel: false, timeout: 60000, use: {baseURL:"http://127.0.0.1:3002"} },
    { name: "stage8-webkit", testMatch: "stage8.spec.ts", grep: /iPhone WebKit/, use: {browserName:"webkit",baseURL:"http://127.0.0.1:3002",launchOptions:{args:[]}} },
    { name: "app", testMatch: "legacy-regression.spec.ts", use: { baseURL: "http://127.0.0.1:3000" } },
    { name: "stage2", testMatch: "stage2.spec.ts", fullyParallel: false, use: { baseURL: "http://127.0.0.1:3002" } },
    { name: "stage3", testMatch: "stage3.spec.ts", fullyParallel: false, use: { baseURL: "http://127.0.0.1:3002" } },
    { name: "stage4a", testMatch: "stage4a.spec.ts", fullyParallel: false, use: { baseURL: "http://127.0.0.1:3002" } },
    { name: "stage4b", testMatch: "stage4b.spec.ts", fullyParallel: false, use: { baseURL: "http://127.0.0.1:3002" } },
    { name: "stage6", testMatch: "stage6.spec.ts", fullyParallel: false, use: { baseURL: "http://127.0.0.1:3002", permissions: ["microphone"] } },
    { name: "stage7", testMatch: "stage7.spec.ts", fullyParallel: false, timeout: 45_000, use: { baseURL: "http://127.0.0.1:3002", permissions: ["microphone"] } },
  ],
  webServer: [
    {
      // Production without a database: no developer DB migrations or external services.
      command: "npm run start",
      url: "http://127.0.0.1:3000/experiencia",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { APP_BASE_URL: "http://127.0.0.1:3000", DATABASE_URL: "", EMAIL_DRY_RUN: "true", GEMINI_API_KEY: "", NEXT_TELEMETRY_DISABLED: "1" },
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
