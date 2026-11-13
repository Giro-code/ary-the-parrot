import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { emailStart } from "./stage8-helpers";
import { askText, mockSpeech } from "./voice-helpers";

const root = "docs/screenshots/stage9b";

test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage9b-${randomUUID()}` });
  await mockSpeech(page);
});

async function capture(page: Page, name: string) {
  await mkdir(root, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator("body")).not.toContainText(/Mis viajes|Mi viaje|My trips|My trip/i);
  await page.screenshot({ path: `${root}/${name}.png`, fullPage: true, animations: "disabled" });
}

for (const pass of [1, 2]) test(`visual pass ${pass}: account layouts and cultural collection in ES/EN at four widths`, async ({ page, context }) => {
  for (const width of [390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ["es", "en"] as const) {
      await context.clearCookies();
      for (const [path, state] of [["/experiencia", "welcome"], ["/reingresar", "recovery"], ["/auth/verify?token=invalid", "invalid-link"], ["/cuenta/privacidad", "account"]]) {
        await page.goto(`${path}${path.includes("?") ? "&" : "?"}lang=${locale}`);
        await page.reload();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        if (state === "account") await expect(page.getByRole("link", { name: locale === "es" ? "Recuperar Mi cultura" : "Recover My culture", exact: true })).toBeVisible();
        if (state === "welcome" || state === "recovery") {
          await expect(page.locator('input[type="email"]')).toBeVisible();
          const metrics = await page.locator(".account-journey").evaluate(node => {
            const content = node.querySelector(".account-content")!.getBoundingClientRect();
            const steps = [...node.querySelectorAll(".email-steps li")].map(step => step.getBoundingClientRect().top);
            const button = node.querySelector(".account-form button")!;
            const text = document.createRange();
            text.selectNodeContents(button.firstChild!);
            return {
              width: node.getBoundingClientRect().width,
              contentWidth: content.width,
              columns: getComputedStyle(node).gridTemplateColumns.split(" ").length,
              stepRows: new Set(steps).size,
              buttonLines: new Set([...text.getClientRects()].map(rect => rect.top)).size,
              scrollers: [...document.querySelectorAll("main, .account-journey, .account-content")].filter(element => /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight).length,
            };
          });
          expect(metrics.scrollers).toBe(0);
          expect(metrics.width).toBeLessThanOrEqual(980);
          if (width >= 900) {
            expect(metrics.columns).toBe(2);
            expect(metrics.contentWidth).toBeGreaterThanOrEqual(420);
            expect(metrics.stepRows).toBe(1);
            expect(metrics.buttonLines).toBe(1);
          } else expect(metrics.columns).toBe(1);
        }
        await capture(page, `pass${pass}-${state}-${locale}-${width}`);
      }
      await emailStart(page, locale);
      await page.goto(`/mi-cultura?lang=${locale}`);
      await page.reload();
      await expect(page.getByRole("heading", { name: locale === "es" ? "Tu colección cultural" : "Your cultural collection", exact: true })).toBeVisible();
      await expect(page.locator(".culture-empty img")).toBeVisible();
      await capture(page, `pass${pass}-culture-empty-${locale}-${width}`);
    }
  }
});

test("legacy page redirects permanently with language and culture links point to the new route", async ({ page, request }) => {
  const response = await request.get("/mi-viaje?lang=en", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/mi-cultura?lang=en");
  await page.goto("/mi-viaje?lang=en");
  await expect(page).toHaveURL(/\/mi-cultura$/);
  await expect(page.getByRole("link", { name: "My culture", exact: true })).toHaveAttribute("href", "/mi-cultura");
});

test("English chat saves to My culture and welcome errors recover with page scrolling", async ({ page }) => {
  await page.goto("/experiencia?lang=en");
  await page.route("**/api/auth/start", route => route.fulfill({ status: 503, json: { error: "service_unavailable" } }));
  await page.locator("#welcome-email").fill(`${randomUUID()}@example.invalid`);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Start talking to Ary", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "continue on my own" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 480 });
  await capture(page, "welcome-error-en-short-desktop");
  await page.locator(".account-form button").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.unroute("**/api/auth/start");
  // No click: the form retries on its own once the service answers.
  await expect(page.locator(".voice-chat")).toBeVisible({ timeout: 20000 });
  await askText(page, "Tell me about merengue");
  await page.getByRole("button", { name: "Save to My culture", exact: true }).first().click();
  await page.getByRole("link", { name: "My culture", exact: true }).click();
  await expect(page.locator(".cultural-card")).toBeVisible();
  await expect(page.locator(".culture-empty")).toHaveCount(0);
});
