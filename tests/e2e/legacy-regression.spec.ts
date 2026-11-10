import { test as base, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

base.use({ extraHTTPHeaders: { "x-vercel-ip-country": "MX" } });

const views = ["inicio", "conoce", "historia", "nosotros", "brochure", "solicitar"];
const widths = [390, 820, 1440, 1920];

const test = base.extend({
  page: async ({ page }, runTest) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      // Only the new, intentionally unavailable production APIs may emit HTTP 503.
      // All landing, JS and CSP errors still fail the regression unchanged.
      const expectedUnavailable = /Failed to load resource.*503/.test(message.text()) && /\/api\/(health|visitor\/|kiosk\/)/.test(message.location().url);
      if (message.type() === "error" && !expectedUnavailable) errors.push(message.text());
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP ${event.violatedDirective}`));
    });
    await runTest(page);
    expect(errors, "errores de JS, consola o CSP").toEqual([]);
  },
});

async function ready(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Lazy images inside hidden sections never load; only wait for rendered ones, with a cap.
    const visible = [...document.images].filter((image) => image.getClientRects().length > 0);
    const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
    await Promise.race([Promise.all(visible.map((image) => image.decode().catch(() => undefined))), timeout]);
    // Freeze transitions (the skip link animates in on focus) so both versions are captured at rest.
    const style = document.createElement("style");
    // The focus-only skip link is hidden in both captures; its behavior has its own test.
    style.textContent = "*,*::before,*::after{transition:none!important}.skip{visibility:hidden!important}";
    document.head.append(style);
    (document.activeElement as HTMLElement | null)?.blur();
  });
}

for (const width of widths) for (const locale of ["es","en"]) test(`new landing ${locale} at ${width}px: functional sections and credits`, async ({page})=>{
  await page.setViewportSize({width,height:900}); await page.goto(`/?lang=${locale}`);
  for(const view of views){ await page.goto(`/#${view}`); await expect(page.locator(`#${view}`)).toBeVisible(); await ready(page); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }
  await page.goto('/#inicio'); await expect(page.locator('.place-photo').first()).toContainText('Wikimedia Commons'); await expect(page.locator('body')).not.toContainText(/kiosco|kiosk/i);
  await page.locator('.talk-to-ary').click(); await expect(page).toHaveURL(/\/experiencia$/); await expect(page.locator('#welcome-email')).toBeVisible();
});

test("router conserva navegación, history, título y foco", async ({ page }) => {
  await page.goto("/#inicio");
  for (const view of views.slice(1)) {
    await page.locator(`#nav a[href="#${view}"]`).click();
    await expect(page.locator(`#${view}`)).toBeVisible();
    await expect(page.locator("#main")).toBeFocused();
    const title = (await page.locator(`#${view} h1`).textContent()) ?? "";
    await expect(page).toHaveTitle(`${title.replace(/\s+/g, " ")} · Ary`);
  }
  await page.goBack();
  await expect(page.locator("#brochure")).toBeVisible();
  await page.goForward();
  await expect(page.locator("#solicitar")).toBeVisible();
  await page.goto("/#desconocida");
  await expect(page).toHaveURL(/#inicio$/);
  await expect(page.locator("#inicio")).toBeVisible();
});

test("menú móvil abre, cierra, responde a Escape y conserva foco", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.locator(".menu");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#nav")).toBeVisible();
  await expect(menu).toBeFocused();
  await menu.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#nav")).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await menu.press("Tab");
  await expect(page.locator('#nav a[href="#inicio"]')).toBeFocused();
  await page.locator('#nav a[href="#conoce"]').click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#main")).toBeFocused();
});

test("skip link permite saltar al contenido por teclado", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("escenarios cambian texto, aria-selected y tabulación con teclado", async ({ page }) => {
  await page.goto("/#conoce");
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(3);
  const airport = page.locator("#tab-aeropuerto");
  const restaurant = page.locator("#tab-restaurante");
  const cultural = page.locator("#tab-cultural");
  await airport.focus();
  await airport.press("ArrowRight");
  await expect(restaurant).toBeFocused();
  await expect(restaurant).toHaveAttribute("aria-selected", "true");
  await expect(airport).toHaveAttribute("tabindex", "-1");
  await expect(page.locator("#context-title")).toHaveText("Cada sabor tiene una historia que contar.");
  await expect(page.locator("#context-panel")).toHaveAttribute("aria-labelledby", "tab-restaurante");
  await restaurant.press("End");
  await expect(cultural).toHaveAttribute("aria-selected", "true");
  await expect(cultural).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#context-title")).toHaveText("Un lugar se disfruta más cuando conoces su historia.");
  await cultural.press("ArrowRight");
  await expect(airport).toBeFocused();
  await airport.press("ArrowLeft");
  await expect(cultural).toBeFocused();
  await cultural.press("Home");
  await expect(airport).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#context-value")).toContainText("No representa una alianza confirmada");
  await restaurant.click();
  await expect(restaurant).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { selected: true })).toHaveCount(1);
});

test("demo conserva sus tres respuestas y restaura foco al cerrar", async ({ page }) => {
  await page.goto("/#inicio");
  const opener = page.locator("#inicio [data-demo]");
  await opener.click();
  await expect(page.locator("#demo-dialog")).toBeVisible();
  for (const [interest, word, scene] of [
    ["cultura", "Zona Colonial", "culture"],
    ["comida", "mangú", "food"],
    ["naturaleza", "aire libre", "nature"],
  ]) {
    await page.locator(`[data-interest="${interest}"]`).click();
    await expect(page.locator("#demo-answer")).toContainText(word);
    await expect(page.locator("#demo-scene")).toHaveAttribute("href", `#scene-${scene}`);
    await expect(page.locator('[data-interest][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator("#demo-visual")).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("#demo-dialog")).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole("button", { name: "Cerrar demostración" }).click();
  await expect(page.locator("#demo-dialog")).toBeHidden();
});

test("presentación conserva tres diapositivas, límites, flechas y Escape", async ({ page }) => {
  await page.goto("/#historia");
  const opener = page.locator("[data-presentation]");
  await opener.click();
  await expect(page.locator("#slide-count")).toHaveText("1 / 3");
  await expect(page.locator("#prev-slide")).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#slide-count")).toHaveText("2 / 3");
  await expect(page.locator("#slide-title")).toHaveText("De la curiosidad al descubrimiento.");
  await page.locator("#next-slide").click();
  await expect(page.locator("#slide-count")).toHaveText("3 / 3");
  await expect(page.locator("#next-slide")).toBeDisabled();
  // Original behavior (legacy too): the disabled "next" button drops focus out of the dialog,
  // so arrow keys only work again once focus is back inside it.
  await page.locator("#prev-slide").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#slide-count")).toHaveText("3 / 3");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#slide-count")).toHaveText("2 / 3");
  await page.locator("#prev-slide").click();
  await expect(page.locator("#slide-count")).toHaveText("1 / 3");
  await page.keyboard.press("Escape");
  await expect(page.locator("#presentation-dialog")).toBeHidden();
  await expect(opener).toBeFocused();
});

test("solicitud valida campos y descarga TXT local con los datos", async ({ page }) => {
  // Preparing preserves the local TXT path. Sending requires a separate explicit checkbox.
  await page.goto("/#solicitar");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#request-result")).toBeHidden();
  expect(await page.locator("#name").evaluate((field: HTMLInputElement) => field.validity.valueMissing)).toBe(true);
  await page.locator("#name").fill("   ");
  await page.locator("#org").fill("Organización de prueba");
  await page.locator("#email").fill("correo-invalido");
  await page.locator("#place").selectOption({ label: "Hotel" });
  await page.locator("#message").fill("Queremos conocer la propuesta cultural.");
  await page.locator('button[type="submit"]').click();
  expect(await page.locator("#email").evaluate((field: HTMLInputElement) => field.validity.typeMismatch)).toBe(true);
  await page.locator("#email").fill("visitante@example.invalid");
  await page.locator('button[type="submit"]').click();
  expect(await page.locator("#name").evaluate((field: HTMLInputElement) => field.validity.customError)).toBe(true);
  await page.locator("#name").fill(" Visitante de prueba ");
  await page.locator("#message").fill("          ");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#request-result")).toBeHidden();
  await page.locator("#message").fill("Queremos conocer la propuesta cultural.");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#request-result")).toContainText("La solicitud todavía no se ha enviado");
  await expect(page.locator("#request-result")).toBeFocused();
  const [download] = await Promise.all([
    page.waitForEvent("download"), page.locator("#download-request").click(),
  ]);
  expect(download.suggestedFilename()).toBe("Solicitud-Ary-la-Cotorra.txt");
  const text = await readFile((await download.path())!, "utf8");
  for (const value of ["Nombre: Visitante de prueba", "Organización: Organización de prueba", "Correo: visitante@example.invalid", "Espacio: Hotel", "Queremos conocer la propuesta cultural.", "Esta solicitud no se ha enviado."]) {
    expect(text).toContain(value);
  }
  await page.locator("#message").fill("Cambio de idea para el resumen.");
  await expect(page.locator("#request-result")).toBeHidden();
});

test("brochure independiente, impresión disponible y enlace de regreso", async ({ page }) => {
  const response = await page.goto("/brochure.html");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Ary la Cotorra · Brochure");
  await expect(page.locator(".sheet")).toHaveCount(2);
  await ready(page);
  expect(await page.locator("img").evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => {
    window.print = () => { document.documentElement.dataset.printCalled = "true"; };
  });
  await page.getByRole("button", { name: "Imprimir / Guardar como PDF" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-called", "true");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sheet").first()).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("link", { name: "Volver a la web de Ary" }).click();
  await expect(page.locator("#brochure")).toBeVisible();
});

test("production headers and honest unavailable database",async({request})=>{
 const health=await request.get('/api/health'); expect(health.status()).toBe(503); expect((await health.json()).checks.email).toBe('dry_run');
 for(const path of ['/', '/index.html','/brochure.html','/experiencia','/kiosco','/terminos','/mis-conversaciones']){const r=await request.get(path);expect(r.status()).toBe(200);expect(r.headers()['content-security-policy']).toContain("frame-ancestors 'none'");expect(r.headers()['x-powered-by']).toBeUndefined();}
});
