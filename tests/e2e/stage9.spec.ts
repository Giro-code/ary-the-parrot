import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { emailStart } from "./stage8-helpers";
import { askText, mockSpeech, startChat } from "./voice-helpers";
import type { Item } from "../../src/components/types";
import type { ChatSource } from "../../src/server/ai/chat";

const origin = "http://127.0.0.1:3002", root = "docs/screenshots/stage9";
test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage9-${randomUUID()}` });
  await mockSpeech(page);
});
async function sources(page: Page) {
  const response = await page.request.get("/api/cultural/items?locale=es&limit=50");
  expect(response.ok()).toBe(true);
  const { items } = await response.json() as { items: Item[] };
  return ["Ballenas jorobadas de Samaná", "Parque Nacional Los Haitises"].map(title => {
    const item = items.find(row => row.title === title)!;
    expect(item?.image).toBeDefined(); expect(item?.mapsUrl).toBeDefined();
    return { id: item.id, title: item.title, summary: item.summary, url: item.sourceUrl!, editor: item.editor, image: item.image, mapsUrl: item.mapsUrl, location: title === "Ballenas jorobadas de Samaná" ? "Bahía de Samaná" : title } satisfies ChatSource;
  });
}
// Simulated chat transport with real published catalog media. Server/provider provenance is tested in Vitest.
async function simulateAnswer(page: Page, cards: ChatSource[]) {
  await page.route("**/api/chat", async route => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({ json: { messageId: randomUUID(), detectedLanguage: "es", displayText: "Descubre la Bahía de Samaná y sus paisajes.", spokenText: "Descubre la Bahía de Samaná y sus paisajes.", intent: "culture", citedItemIds: cards.map(card => card.id), followUps: [], confidence: .95, mode: "gemini", handoff: false, sources: cards } });
  });
}
async function capture(page: Page, name: string) {
  await mkdir(root, { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {}))); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${root}/${name}.png`, fullPage: true, animations: "disabled" });
}
test("web Samaná photo, attribution, location chip, server Maps link and trip thumbnail", async ({ page }) => {
  const cards = await sources(page); await emailStart(page); await simulateAnswer(page, cards.slice(0, 1));
  await askText(page, "¿Qué ver en Samaná?");
  await expect(page.locator(".chat-card img")).toBeVisible(); await expect(page.locator(".image-credit")).toContainText("Danu Widjajanto · Wikimedia Commons");
  await expect(page.locator('[data-ary-image="mostrar"]')).toBeVisible();
  await page.unroute("**/api/chat");
  await page.getByRole("button", { name: "¿Quieres la ubicación?", exact: true }).click();
  const maps = page.getByRole("link", { name: "Abrir en Google Maps", exact: true });
  await expect(maps).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=19\.1667,-69\.4167$/);
  await expect(maps).toHaveAttribute("target", "_blank"); await expect(maps).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator(".record-location")).toHaveText("Bahía de Samaná");
  const lastCard = page.locator(".chat-card").last();
  await lastCard.getByRole("button", { name: "Guardar en Mi cultura", exact: true }).click();
  await page.goto("/mi-cultura");
  await expect(page.locator(".cultural-card .item-photo img")).toBeVisible();
  await expect(page.locator(".cultural-card .maps-link")).toHaveAttribute("href", cards[0].mapsUrl!);
  await page.goto(`/cultura/${cards[0].id}`);
  await expect(page.locator(".photo-large img")).toBeVisible(); await expect(page.locator(".image-credit")).toContainText("CC BY-SA 4.0");
  await expect(page.locator(".maps-link")).toHaveAttribute("href", cards[0].mapsUrl!);
});
test("two-card carousel at 390px supports keyboard, indicators and no page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const cards = await sources(page); await emailStart(page); await simulateAnswer(page, cards);
  await askText(page, "¿Qué ver en Samaná y Los Haitises?");
  const track = page.locator(".source-track"); await expect(track.locator("article")).toHaveCount(2);
  await track.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.locator('.carousel-indicators button').nth(1)).toHaveAttribute("aria-current", "true");
  expect(await track.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await page.locator('.carousel-indicators button').first().click();
  await expect(page.locator('.carousel-indicators button').first()).toHaveAttribute("aria-current", "true");
  await capture(page, "carousel-390");
});
test("photo dialog traps focus, closes with Esc and returns focus to its photo", async ({ page }) => {
  const cards = await sources(page); await emailStart(page); await simulateAnswer(page, cards.slice(0, 1));
  await askText(page, "Samaná"); const photo = page.locator(".photo-open"); await photo.click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    }
  }
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(photo).toBeFocused();
});
test("kiosk shows photos, offers a phone QR and never exposes an external card or Maps link", async ({ page }) => {
  const cards = await sources(page);
  const fixture = JSON.parse(await readFile(".cache/stage2-fixture.json", "utf8"));
  const activation = await page.request.post("/api/kiosk/activate", { headers: { Origin: origin, "X-Ary-Request": "1" }, data: { code: fixture.activationCodes[16] } }); expect(activation.ok()).toBe(true);
  await startChat(page); await simulateAnswer(page, cards.slice(0, 1)); await askText(page, "Samaná");
  await expect(page.locator(".chat-card .item-photo img")).toBeVisible(); await expect(page.locator(".chat-card a")).toHaveCount(0);
  await page.locator(".photo-open").click();
  const closePhoto = page.getByRole("button", { name: "Cerrar foto", exact: true });
  await expect(closePhoto).toBeFocused();
  for (const key of ["Tab", "Shift+Tab"]) { await page.keyboard.press(key); await expect(closePhoto).toBeFocused(); }
  await page.keyboard.press("Escape"); await expect(page.locator(".photo-open")).toBeFocused();
  await page.unroute("**/api/chat"); await page.getByRole("button", { name: "¿Quieres la ubicación?", exact: true }).click();
  await expect(page.locator(".inline-handoff")).toBeVisible();
  await expect(page.locator('.chat-card a, a[href*="google.com/maps"]')).toHaveCount(0);
});
for (const pass of [1, 2]) test(`visual pass ${pass}: chat, dialog, Maps, public card, trips and kiosk at 390/1440`, async ({ page }) => {
  test.setTimeout(180000);
  for (const width of [390, 1440]) {
    await page.context().clearCookies(); await page.setViewportSize({ width, height: 900 });
    const cards = await sources(page); await emailStart(page); await page.reload(); await simulateAnswer(page, cards);
    await askText(page, "¿Qué ver en Samaná y Los Haitises?"); await capture(page, `pass${pass}-chat-${width}`);
    await page.locator(".photo-open").first().click(); await capture(page, `pass${pass}-photo-${width}`); await page.keyboard.press("Escape");
    await page.unroute("**/api/chat"); await page.getByRole("button", { name: "¿Quieres la ubicación?", exact: true }).first().click();
    await expect(page.locator(".maps-link")).toBeVisible(); await capture(page, `pass${pass}-maps-${width}`);
    await page.locator(".chat-card").last().getByRole("button", { name: "Guardar en Mi cultura", exact: true }).click();
    await page.goto("/mi-cultura"); await page.reload(); await expect(page.locator(".cultural-card .item-photo")).toBeVisible(); await capture(page, `pass${pass}-trips-${width}`);
    await page.goto(`/cultura/${cards[0].id}`); await page.reload(); await expect(page.locator(".photo-large")).toBeVisible(); await capture(page, `pass${pass}-public-${width}`);
    await page.context().clearCookies(); await page.goto("/kiosco"); await page.reload();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await startChat(page); await simulateAnswer(page, cards.slice(0, 1));
    await askText(page, "Samaná"); await expect(page.locator(".chat-card .item-photo img")).toBeVisible(); await expect(page.locator(".chat-card a")).toHaveCount(0); await capture(page, `pass${pass}-kiosk-${width}`);
    await page.unroute("**/api/chat");
  }
});
