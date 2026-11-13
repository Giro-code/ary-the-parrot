import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { emailStart, switchToChat } from "./stage8-helpers";
import { askText, mockSpeech } from "./voice-helpers";
const folder = "docs/screenshots/stage10b";
test.beforeEach(async ({ page, context }) => { await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage10b-${randomUUID()}` }); await mockSpeech(page); });
async function capture(page: Page, name: string) {
  await mkdir(folder, { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(im => im.getClientRects().length).map(im => im.decode().catch(() => {}))); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true, animations: "disabled" });
}
async function staffLogin(page: Page) {
  await page.goto("/admin/entrar"); await page.getByLabel("Correo de personal").fill("admin.demo@example.invalid");
  await page.getByRole("button", { name: "Solicitar enlace de acceso", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Si tienes una membresía activa" })).toBeVisible();
  await page.goto("/dev/outbox");
  const article = page.locator("article").filter({ hasText: "admin.demo@example.invalid" }).filter({ hasText: "Acceso del personal" }).first();
  await page.goto((await article.locator('a[href*="/admin/entrar?token="]').first().getAttribute("href"))!);
  await page.getByRole("button", { name: "Confirmar acceso de personal", exact: true }).click();
  await expect(page).not.toHaveURL(/\/admin\/entrar/);
}
test("chat has photos, credits, Maps, food and traditions from the catalog", async ({ page }) => {
  await emailStart(page); await switchToChat(page);
  const reply = await (await askText(page, "Háblame de Bahía de las Águilas")).json();
  expect(reply.sources[0].image.credit).toBeTruthy(); expect(reply.sources[0].mapsUrl).toContain("google.com/maps");
  await expect(page.locator(".chat-card img")).toBeVisible(); await expect(page.locator(".image-credit")).toContainText("CC BY-SA");
  await expect(page.getByRole("button", { name: "¿Quieres la ubicación?" })).toBeVisible();
  for (const [query, type] of [["¿qué puedo comer?", "food"], ["fiestas dominicanas", "tradition"]]) {
    const answer = await (await askText(page, query)).json(); expect(answer.sources.length).toBeGreaterThan(1);
    for (const source of answer.sources) expect((await (await page.request.get(`/api/cultural/items/${source.id}`)).json()).item.type).toBe(type);
  }
});
test("El Limón uses its available gallery; lightbox Esc and trapped focus", async ({ page }) => {
  await emailStart(page); const reply = await (await askText(page, "muéstrame fotos del Salto El Limón")).json();
  expect(reply.sources[0].gallery).toHaveLength(1); // Protected 10A data contains one photo, never fabricate extras.
  await page.locator(".photo-open").last().click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await expect(dialog.locator("img")).toHaveAttribute("alt", /Limón/);
  await expect(dialog.locator(".image-credit")).toContainText("CC BY-SA");
  await page.keyboard.press("Shift+Tab"); expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(page.locator(".photo-open").last()).toBeFocused();
});
test("synthetic multi-photo fixture exercises arrows without changing catalog data", async ({ page }) => {
  await emailStart(page);
  await page.route("**/api/chat", async route => {
    const response = await route.fetch(); const reply = await response.json(); const source = reply.sources[0];
    // Same verified asset repeated, with explicitly synthetic alt, tests navigation only.
    source.gallery = [source.image, { ...source.image, alt: "SYNTHETIC second gallery frame" }];
    await route.fulfill({ response, json: reply });
  });
  await askText(page, "muéstrame fotos del Salto El Limón");
  await page.locator(".photo-open").last().click();
  const dialog = page.getByRole("dialog");
  await page.keyboard.press("ArrowRight"); await expect(dialog.locator("img")).toHaveAttribute("alt", "SYNTHETIC second gallery frame");
  await page.keyboard.press("ArrowLeft"); await expect(dialog.locator("img")).toHaveAttribute("alt", /Limón/);
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
});
test("staff hides both languages from chat and can show them again", async ({ page }) => {
  await emailStart(page); await staffLogin(page); await page.goto("/admin/catalogo");
  await page.getByLabel("Buscar", { exact: true }).fill("bahia de las aguilas"); await page.getByRole("button", { name: "Buscar fichas" }).click();
  const record = page.locator(".catalog-record").filter({ hasText: "Bahía de las Águilas" });
  await record.getByRole("button", { name: "Ocultar", exact: true }).click();
  try {
    await expect(record.getByRole("button", { name: "Mostrar", exact: true })).toBeVisible();
    await page.goto("/experiencia"); const hidden = await (await askText(page, "bahia de las aguilas")).json();
    expect(hidden.sources.some((s: { title: string }) => /águilas/i.test(s.title))).toBe(false);
  } finally {
    await page.goto("/admin/catalogo"); await page.getByLabel("Buscar", { exact: true }).fill("bahia de las aguilas"); await page.getByRole("button", { name: "Buscar fichas" }).click();
    await page.locator(".catalog-record").filter({ hasText: "Bahía de las Águilas" }).getByRole("button", { name: "Mostrar", exact: true }).click();
  }
  await page.goto("/experiencia"); const shown = await (await askText(page, "bahia de las aguilas")).json();
  expect(shown.sources.some((s: { title: string }) => /águilas/i.test(s.title))).toBe(true);
});
test("voice mode renders sourced fact subtitles and card with offline voice response", async ({ page }) => {
  await emailStart(page, "es", undefined, false);
  // Execute real deterministic chat service first, then reuse it as a synthetic transcription response.
  const response = await page.request.post("/api/chat", { headers: { origin: "http://127.0.0.1:3002", "x-ary-request": "1" }, data: { message: "cuéntame del merengue" } });
  const reply = await response.json(); expect(reply.sources[0].title).toMatch(/merengue/i);
  expect(reply.displayText).toMatch(/UNESCO|música|baile/i);
  await page.route("**/api/voice/ask", route => route.fulfill({ json: { ...reply, transcript: "cuéntame del merengue" } }));
  await mockSpeech(page, .4);
  await page.locator(".voice-main-mic").click(); await page.getByRole("button", { name: "Acepto · Grabar", exact: true }).click();
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(400); await page.locator(".voice-main-mic").click();
  await expect(page.locator(".chat-message.assistant").last()).toContainText(reply.displayText);
  await expect(page.locator(".chat-card h2").last()).toContainText("Merengue");
});
for (const pass of [1, 2]) test(`visual capture pass ${pass}: ES EN, 390 and 1440`, async ({ page, context }) => {
  test.setTimeout(240000);
  for (const locale of ["es", "en"] as const) for (const width of [390, 1440]) {
    await context.clearCookies(); await page.setViewportSize({ width, height: 900 }); await emailStart(page, locale); await page.reload();
    await askText(page, locale === "es" ? "Háblame de Bahía de las Águilas" : "Tell me about Bahia de las Aguilas"); await capture(page, `pass${pass}-${locale}-${width}-card`);
    await askText(page, locale === "es" ? "muéstrame fotos del Salto El Limón" : "show photos of El Limon Waterfall"); await capture(page, `pass${pass}-${locale}-${width}-gallery`);
    await page.locator(".photo-open").last().click(); await capture(page, `pass${pass}-${locale}-${width}-lightbox`); await page.keyboard.press("Escape");
  }
  await staffLogin(page);
  for (const locale of ["es", "en"] as const) for (const width of [390, 1440]) {
    // Staff shell remains Spanish, as in the existing panel; every row includes ES/EN titles.
    await page.setViewportSize({ width, height: 900 }); await page.goto(`/admin/catalogo?lang=${locale}`); await page.reload();
    await page.getByLabel("Buscar", { exact: true }).fill("bahia de las aguilas"); await page.getByRole("button", { name: "Buscar fichas" }).click();
    await expect(page.locator(".catalog-record")).toHaveCount(1); await capture(page, `pass${pass}-staff-${locale}-${width}`);
  }
});
test("welcome keeps the form offline and finishes on its own when the connection returns", async ({ page }) => {
  await page.goto("/experiencia?lang=es");
  await page.getByLabel("Tu correo").fill(`offline-${randomUUID()}@example.test`);
  await page.getByRole("checkbox").first().check();
  await page.route("**/api/auth/start", route => route.abort("internetdisconnected"));
  await page.getByRole("button", { name: "Empezar a hablar con Ary" }).click();
  await expect(page.getByRole("button", { name: "Esperando conexión…" })).toBeVisible();
  await expect(page.locator(".waiting-connection")).toContainText("seguiré solo");
  await page.unroute("**/api/auth/start");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText("¡Todo listo para conversar!")).toBeVisible({ timeout: 15000 });
});
