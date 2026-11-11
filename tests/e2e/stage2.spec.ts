import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { emailStart, switchToChat } from "./stage8-helpers";
import { askText, mockSpeech } from "./voice-helpers";
import { recoveryTitle } from "./helpers";
const evidence = "docs/evidence/stage2";
const origin = "http://127.0.0.1:3002";
const headers = { Origin: origin, "X-Ary-Request": "1" };
async function fixture() { return JSON.parse(await readFile(".cache/stage2-fixture.json", "utf8")) as { activationCodes: string[]; expiredToken: string }; }
async function activate(page: Page, index: number) {
  await page.goto(`/kiosco/activar?code=${(await fixture()).activationCodes[index]}`);
  // On a cold dev server the first click can land before hydration and do nothing; retry until it navigates.
  await expect(async () => {
    if (!/\/kiosco$/.test(page.url())) await page.getByRole("button", { name: "Activar este kiosco", exact: true }).click();
    await expect(page).toHaveURL(/\/kiosco$/, { timeout: 3000 });
  }).toPass({ timeout: 30000 });
  await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByText(/^(Dispositivo autorizado|Authorized device)$/)).toBeVisible();
}
async function discover(page: Page) {
  // The kiosk starts in English (airport default); these flows are written in Spanish.
  await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click();
  await switchToChat(page);
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.locator('.kiosk-content[data-state="conversation"]')).toBeVisible(); await switchToChat(page);
  await page.locator(".chat-quick-replies").getByRole("button", { name: "Español", exact: true }).click();
  await askText(page, "Soy de Bolivia");
  await askText(page, "Cuéntame sobre el merengue");
  await expect(page.locator(".chat-card").first()).toBeVisible();
  await expect(page.getByText("Respuestas de ejemplo", { exact: true })).toBeVisible();
}
test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage2-${randomUUID()}` });
  await mockSpeech(page);
});
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
test("A authorized kiosk → B mobile restores exactly → clean kiosk → C replay denied", async ({ page, browser }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 800 }); await activate(page, 0); await discover(page);
  await page.getByRole("button", { name: "Guardar en Mi cultura", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Guardado", exact: true })).toHaveCount(1);
  await capture(page, "flow-kiosk-recommendations-1280");
  const responsePromise = page.waitForResponse(response => response.url().endsWith("/api/visitor/handoff") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Continuar en mi teléfono", exact: true }).click();
  const qr = await (await responsePromise).json() as { url: string; confirmationCode: string };
  expect(qr.url).toMatch(/^http:\/\/127\.0\.0\.1:3002\/q\/[\w-]{43}$/);
  await expect(page.locator(".confirmation-code")).toHaveText(qr.confirmationCode);
  const mobile = await browser.newContext({ locale: "es-ES", viewport: { width: 390, height: 844 }, baseURL: origin });
  const third = await browser.newContext({ locale: "es-ES", viewport: { width: 390, height: 844 }, baseURL: origin });
  try {
    const phone = await mobile.newPage(), other = await third.newPage();
    const beforeCookie = (await page.context().cookies()).find(cookie => cookie.name === "ary_sid")?.value;
    const preview = await phone.goto(qr.url);
    expect(preview?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(preview?.headers()["cache-control"]).toContain("no-store");
    await expect(phone.locator(".confirmation-code")).toHaveText(qr.confirmationCode);
    const before = await page.context().request.get("/api/visitor/handoff/status"); expect((await before.json()).status).toBe("pending");
    await capture(phone, "flow-confirmation-390");
    await phone.getByRole("button", { name: "Continuar mi experiencia", exact: true }).click();
    await expect(phone).toHaveURL(`${origin}/experiencia`);
    await expect(phone.locator("#welcome-email")).toBeVisible();
    const restored = await mobile.request.get("/api/visitor/me");
    expect((await restored.json()).session).toMatchObject({ locale: "es", countryDeclared: "BO", interests: ["music"] });
    expect((await (await mobile.request.get("/api/saved")).json()).items).toHaveLength(1);
    const cookie = (await mobile.cookies()).find(cookie => cookie.name === "ary_sid");
    expect(cookie?.value).not.toBe(beforeCookie); expect(cookie?.httpOnly).toBe(true); expect(cookie?.sameSite).toBe("Lax");
    await capture(phone, "flow-mobile-restored-390");
    await expect(page.locator('[data-state="idle"]')).toBeVisible({ timeout: 12000 });
    await expect(page.locator(".confirmation-code")).toHaveCount(0);
    expect((await page.context().request.get("/api/visitor/me")).status()).toBe(401);
    await other.goto(qr.url); await expect(other.getByRole("heading", { name: "Este código no está disponible." })).toBeVisible();
    await expect(other.locator(".confirmation-code")).toHaveCount(0);
    await phone.getByRole("link", { name: "Mi cultura", exact: true }).click();
    await phone.locator(".saved-controls select").selectOption("visited");
    await expect(phone.getByText("1 / 1 realizadas", { exact: true })).toBeVisible();
    await phone.getByRole("button", { name: "Marcar favorito" }).click();
    await expect(phone.getByRole("button", { name: "Quitar favorito" })).toHaveAttribute("aria-pressed", "true");
    await phone.getByRole("button", { name: "Compartir ficha" }).click();
    await expect(phone.getByText("QR público de la ficha · no transfiere tu sesión")).toBeVisible();
    await capture(phone, "flow-trip-390");
  } finally { await mobile.close(); await third.close(); }
});
test("expired and altered QR show safe recovery UX", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/q/${(await fixture()).expiredToken}`);
  await expect(page.getByRole("heading", { name: "Este código ha caducado." })).toBeVisible();
  await expect(page.getByText("Pide un código nuevo en el kiosco.", { exact: true })).toBeVisible();
  await capture(page, "expired-390");
  await page.goto(`/q/${"a".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "Este código no está disponible." })).toBeVisible();
  await expect(page.locator(".confirmation-code")).toHaveCount(0);
});
test("no email, keyboard navigation, optional preferences and demo permission boundary", async ({ page }) => {
  await page.goto("/kiosco"); await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click(); await switchToChat(page); await expect(page.getByRole("button", { name: "Iniciar", exact: true })).toBeEnabled();
  await page.getByRole("link", { name: "Ir al contenido" }).focus(); await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
  await page.getByRole("button", { name: "Iniciar", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.locator('.kiosk-content[data-state="conversation"]')).toBeVisible(); await switchToChat(page);
  await page.locator(".chat-quick-replies").getByRole("button", { name: "Español", exact: true }).click();
  await askText(page, "Sorpréndeme");
  await expect(page.getByRole("button", { name: "Continuar en mi teléfono" })).toBeDisabled();
  const denied = await page.context().request.post("/api/visitor/handoff", { headers, data: {} }); expect(denied.status()).toBe(403);
  await page.getByRole("button", { name: "Terminar sin continuar", exact: true }).click();
  await expect(page.locator('[data-state="idle"]')).toBeVisible({ timeout: 10000 });
  await emailStart(page);
  await page.locator(".chat-quick-replies").getByRole("button", { name: "Español", exact: true }).click();
  await askText(page, "Cuéntame del mangú");
  await expect(page.getByRole("heading", { name: "Mangú", exact: true })).toBeVisible();
  await page.goto("/reingresar");
  await expect(page.getByRole("heading", { name: recoveryTitle.es, exact: true })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveCount(1);
  await expect(page.locator('input[type="checkbox"]').first()).not.toBeChecked();
});
test("kiosk cancels, resets on inactivity and reports actual offline state", async ({ page, context }) => {
  // Install the fake clock before the kiosk loads so its inactivity timers use it (it still runs naturally).
  await page.clock.install();
  await activate(page, 1); await discover(page);
  await page.getByRole("button", { name: "Continuar en mi teléfono" }).click(); await expect(page.locator(".confirmation-code")).toBeVisible();
  await page.getByRole("button", { name: "Terminar sin continuar" }).click(); await expect(page.locator('[data-state="idle"]')).toBeVisible({ timeout: 10000 });
  await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click();
  await switchToChat(page);
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  // Wait until the session has started (two API calls) so the idle countdown begins before time jumps.
  await expect(page.locator(".chat-quick-replies").getByRole("button", { name: "Español", exact: true })).toBeVisible();
  await page.clock.runFor(71000); await expect(page.getByRole("button", { name: "Seguir aquí" })).toBeVisible();
  await page.clock.runFor(20000); await expect(page.locator('[data-state="finished"]')).toBeVisible();
  await page.clock.runFor(5000); await expect(page.locator('[data-state="idle"]')).toBeVisible();
  await context.setOffline(true); await expect(page.getByText("Service offline", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Talk to Ary", exact: true })).toBeDisabled(); await context.setOffline(false);
});
for (const width of [1280, 1920]) test(`Pi proxy load and welcome → recommendations at CPU 4x, ${width}`, async ({ page, context }, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width, height: width === 1280 ? 800 : 1080 });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const js = new Map<string, number>();
  page.on("response", response => { if (response.url().includes("/_next/") && response.url().endsWith(".js")) void response.body().then(body => js.set(response.url(), body.length)).catch(() => undefined); });
  const started = Date.now(); await page.goto("/kiosco"); await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hablar con Ary", exact: true })).toBeEnabled(); const loadMs = Date.now() - started;
  const interactionStart = Date.now(); await discover(page); const interactionMs = Date.now() - interactionStart;
  const metrics = { viewport: width, cpuRate: 4, loadMs, welcomeToRecommendationsMs: interactionMs, servedJsBytes: [...js.values()].reduce((a, b) => a + b, 0), runtime: "Next dev; cold compilation included; production gzip measured separately" };
  await info.attach("pi-performance", { body: JSON.stringify(metrics), contentType: "application/json" });
  await mkdir(evidence, { recursive: true }); await writeFile(`${evidence}/performance-${width}.json`, JSON.stringify(metrics, null, 2));
  expect(loadMs).toBeLessThan(30000); expect(interactionMs).toBeLessThan(15000);
  await capture(page, `performance-${width}`); await cdp.detach();
});
// These two sets are captured after independent navigations/reloads for human inspection.
// Capturing alone does not certify a visual pass. Findings belong in VISUAL_REVIEW.md.
for (const pass of [1, 2]) test(`visual evidence pass ${pass}: 360, 390, 820, 1440`, async ({ page }) => {
  test.setTimeout(60000);
  for (const width of [360, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["kiosco", "experiencia", "mi-viaje", "privacidad", "reingresar"]) {
      await page.goto(`/${route}`); await page.reload();
      await expect(page.locator("main")).toBeVisible(); await capture(page, `pass-${pass}-${route}-${width}`);
    }
  }
});
