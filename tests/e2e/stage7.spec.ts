import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { mockSpeech } from "./voice-helpers";
import { switchToChat } from "./stage8-helpers";
const origin = "http://127.0.0.1:3002", evidence = "docs/screenshots/stage7";
const headers = { Origin: origin, "X-Ary-Request": "1" };
test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage7-${randomUUID()}`, "x-vercel-ip-country": "US" });
  await mockSpeech(page);
});
async function stable(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(img => img.getClientRects().length).map(img => img.decode().catch(() => {})));
    const style = document.createElement("style"); style.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}.skip{visibility:hidden!important}"; document.head.append(style);
    (document.activeElement as HTMLElement | null)?.blur();
  });
}
test("US English, MX Spanish, query cookie wins and initial app HTML is localized", async ({ page, context }) => {
  const en = await page.goto("/"); expect(en?.headers()["vary"]).toContain("Cookie");
  expect(en?.headers()["cache-control"]).toContain("no-store"); await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await context.setExtraHTTPHeaders({ "x-vercel-ip-country": "MX" }); await page.goto("/"); await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.goto("/?lang=en"); await expect(page).toHaveURL(origin + "/"); await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect((await context.cookies()).find(row => row.name === "ary_lang")).toMatchObject({ value: "en", httpOnly: false, sameSite: "Lax", path: "/" });
  for (const route of ["/experiencia", "/mi-cultura", "/privacidad", "/reingresar", "/cuenta/privacidad", "/cultura/00000000-0000-4000-8000-000000000000"]) {
    const response = await page.request.get(route); expect(await response.text()).toContain('<html lang="en"');
    await page.goto(route); await expect(page.getByRole("button", { name: "English", exact: true }).first()).toBeVisible();
  }
});
for (const width of [390, 820, 1440, 1920]) {
  test(`English landing at ${width}px, all sections and interactions`, async ({ page }) => {
    await mkdir(evidence, { recursive: true }); await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const section of ["inicio", "conoce", "historia", "nosotros", "brochure", "solicitar"]) {
      await page.goto(`/#${section}`); await expect(page.locator(`#${section}`)).toBeVisible(); await stable(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${evidence}/english-${section}-${width}.png`, fullPage: true });
    }
    await page.goto("/#inicio"); await page.locator("[data-demo]").first().click(); await page.locator('[data-interest="comida"]').click();
    await expect(page.locator("#demo-answer")).toContainText("flavours"); await page.keyboard.press("Escape");
    await page.goto("/#solicitar"); await page.locator("#name").fill("Test visitor"); await page.locator("#org").fill("Synthetic venue"); await page.locator("#email").fill("test@example.invalid"); await page.locator("#place").selectOption({ label: "Hotel" }); await page.locator("#message").fill("We would like to learn about the proposed pilot."); await page.locator('button[type="submit"]').click();
    await expect(page.locator("#request-result")).toContainText("not been sent");
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download-request").click()]);
    expect(await readFile((await download.path())!, "utf8")).toContain("Name: Test visitor");
    await page.goto("/en/brochure.html"); await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible(); await expect(page.locator(".sheet")).toHaveCount(2);
  });
}
test("kiosk ignores MX/cookie/browser, changes language on one mocked voice answer and resets", async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-vercel-ip-country": "MX" }); await context.addCookies([{ name: "ary_lang", value: "es", url: origin }]);
  await page.goto("/kiosco"); await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".voice-header").getByRole("button", { name: "Español" })).toBeVisible();
  await switchToChat(page); await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator('.kiosk-content[data-state="conversation"]')).toBeVisible(); await switchToChat(page);
  await expect(page.locator(".chat-message.assistant")).toContainText("¿o prefieres español?");
  await page.route("**/api/voice/ask", route => route.fulfill({ json: { messageId: randomUUID(), transcript: "Cuéntame sobre la música", detectedLanguage: "es", displayText: "Descubramos la música dominicana.", spokenText: "Descubramos la música dominicana.", intent: "preferences", citedItemIds: [], followUps: [], confidence: 1, mode: "demo", handoff: false, sources: [], preferences: { locale: "es", countryDeclared: null, interests: ["music"] } } }));
  await page.getByRole("button", { name: "Speak to Ary" }).click(); await page.getByRole("button", { name: "I agree · Record" }).click();
  await page.waitForTimeout(350); await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es"); await expect(page.locator(".chat-message.assistant").last()).toContainText("música dominicana");
  await page.getByRole("button", { name: "Terminar sin continuar" }).click(); await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
for (const phoneLanguage of ["es-ES", "en-US"]) test(`QR adopts ${phoneLanguage} and preserves interests and saved cards`, async ({ page, browser }) => {
  const fixture = JSON.parse(await readFile(".cache/stage2-fixture.json", "utf8"));
  const activation = await page.request.post("/api/kiosk/activate", { headers, data: { code: fixture.activationCodes[phoneLanguage === "es-ES" ? 6 : 7] } }); expect(activation.status(), await activation.text()).toBe(200);
  await page.goto("/kiosco");
  // The kiosk clears any previous session on load; create ours only after it is ready.
  await expect(page.getByRole("button", { name: "Talk to Ary", exact: true })).toBeEnabled({ timeout: 20000 });
  await page.request.post("/api/visitor/session", { headers, data: { locale: phoneLanguage === "es-ES" ? "en" : "es" } });
  await page.request.patch("/api/visitor/preferences", { headers, data: { locale: phoneLanguage === "es-ES" ? "en" : "es", countryDeclared: "BO", interests: ["music"] } });
  const { items } = await (await page.request.get("/api/cultural/items?locale=en")).json();
  await page.request.post("/api/saved", { headers, data: { itemId: items[0].id } });
  const handoff = await page.request.post("/api/visitor/handoff", { headers, data: {} }); const qr = await handoff.json(); expect(handoff.status(), JSON.stringify(qr)).toBe(200);
  const mobile = await browser.newContext({ baseURL: origin, locale: phoneLanguage, viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "x-vercel-ip-country": phoneLanguage === "es-ES" ? "US" : "MX" } });
  try {
    const phone = await mobile.newPage(); await mockSpeech(phone); await phone.goto(qr.url);
    const locale = phoneLanguage === "es-ES" ? "es" : "en";
    await expect(phone.locator("html")).toHaveAttribute("lang", locale);
    await phone.getByRole("button", { name: locale === "es" ? "Continuar mi experiencia" : "Continue my experience", exact: true }).click();
    await expect(phone).toHaveURL(origin + "/experiencia"); await expect(phone.locator("html")).toHaveAttribute("lang", locale);
    expect((await (await mobile.request.get("/api/visitor/me")).json()).session).toMatchObject({ locale, interests: ["music"], countryDeclared: "BO" });
    expect((await (await mobile.request.get("/api/saved")).json()).items[0].item.id).toBe(items[0].id);
  } finally { await mobile.close(); }
});
