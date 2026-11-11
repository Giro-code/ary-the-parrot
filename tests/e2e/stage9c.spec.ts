import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { emailStart, verifyEmail } from "./stage8-helpers";
import { askText, mockSpeech, startChat } from "./voice-helpers";

test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage9c-${randomUUID()}` });
  await mockSpeech(page);
});
async function capture(page: Page, name: string) {
  await mkdir("docs/screenshots/stage9c", { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {}))); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/screenshots/stage9c/${name}.png`, fullPage: true, animations: "disabled" });
}
test("zona colonial renders its relevant card and photo", async ({ page }) => {
  await emailStart(page);
  const response = await askText(page, "háblame sobre la zona colonial"), reply = await response.json();
  expect(reply.intent).toBe("culture"); expect(reply.sources.map((row: { title: string }) => row.title)).toEqual(["Ciudad Colonial de Santo Domingo"]);
  await expect(page.locator(".chat-card h2")).toHaveText("Ciudad Colonial de Santo Domingo");
  await expect(page.locator(".chat-card img")).toBeVisible();
});
test("image request with no context renders a working three-photo carousel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 }); await emailStart(page);
  const response = await askText(page, "muéstrame imágenes"), reply = await response.json();
  expect(reply.sources).toHaveLength(3); expect(reply.spokenText).toBe("Te dejé las fotos en pantalla.");
  await expect(page.locator(".chat-card .item-photo img")).toHaveCount(3);
  const track = page.locator(".source-track"); await track.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.locator(".carousel-indicators button").nth(1)).toHaveAttribute("aria-current", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("simulated provider HTTP 500 still gives a grounded cave answer", async ({ page }) => {
  test.skip(process.env.ARY_E2E_AI_FAILURE !== "1", "Run with ARY_E2E_AI_FAILURE=1 to preload the offline provider failure.");
  await emailStart(page);
  const response = await askText(page, "Háblame de cuevas en RD"), reply = await response.json();
  expect(reply.mode).toBe("demo"); expect(reply.displayText).toContain("Parque Nacional Los Haitises");
  expect(reply.sources.map((row: { title: string }) => row.title)).toEqual(["Parque Nacional Los Haitises"]);
  await expect(page.locator(".chat-messages")).not.toContainText("no puedo pensar bien");
  await expect(page.locator(".chat-card img")).toBeVisible();
});
test("photos follow the last citation in kiosks without Maps or external links", async ({ page }) => {
  await startChat(page); await askText(page, "Los Haitises"); await askText(page, "muéstrame imágenes");
  const last = page.locator(".source-carousel").last(); await expect(last.locator("h2")).toHaveText("Parque Nacional Los Haitises");
  await expect(last.locator(".item-photo img")).toBeVisible(); await expect(last.locator("a")).toHaveCount(0);
});
for (const pass of [1, 2]) test(`visual pass ${pass}: grounded fallback, contextual photos and default carousel`, async ({ page }) => {
  test.setTimeout(180000);
  for (const width of [390, 1440]) {
    await page.context().clearCookies(); await page.setViewportSize({ width, height: 900 });
    await emailStart(page); await page.reload();
    await askText(page, "háblame sobre la zona colonial"); await capture(page, `pass${pass}-colonial-${width}`);
    await askText(page, "muéstrame imágenes"); await capture(page, `pass${pass}-context-${width}`);
    await page.locator(".photo-open").last().click(); await capture(page, `pass${pass}-photo-${width}`); await page.keyboard.press("Escape");
    await page.context().clearCookies(); await emailStart(page); await page.reload();
    await askText(page, "muéstrame imágenes"); await capture(page, `pass${pass}-featured-${width}`);
    await askText(page, "show me photos of Samaná"); await expect(page.locator(".source-carousel").last().locator("h2", { hasText: "Ballenas jorobadas de Samaná" })).toBeVisible();
    await capture(page, `pass${pass}-english-${width}`);
  }
});

for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) test(`verified visitor keeps the composer on screen (${size.width}px)`, async ({ page }) => {
  await page.setViewportSize(size);
  const email = await emailStart(page);
  await askText(page, "Cuéntame del merengue");
  await verifyEmail(page, email);
  await page.goto("/experiencia?lang=es");
  await expect(page.locator(".voice-status")).toBeEmpty();
  const field = page.locator("#ary-message");
  await expect(field).toBeInViewport();
  await expect(field).toBeEnabled();
  const box = await field.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
});
