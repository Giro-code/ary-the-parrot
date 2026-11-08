import { test as base, expect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const screenshots = "docs/screenshots";
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

async function capture(page: Page, path: string) {
  await ready(page);
  const buffer = await page.screenshot({ fullPage: true, animations: "disabled" });
  await mkdir(screenshots, { recursive: true });
  await writeFile(path, PNG.sync.write(PNG.sync.read(buffer), { deflateLevel: 9 }));
  return PNG.sync.read(buffer);
}

for (const width of widths) {
  for (const view of views) {
    test(`${view} a ${width}px conserva vista, título, ancho y píxeles`, async ({ page, browser }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`/#${view}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator(`#${view}`)).toBeVisible();
      await expect(page.locator(".content-page:visible")).toHaveCount(1);
      await expect(page.locator(`#nav a[href="#${view}"]`)).toHaveAttribute("aria-current", "page");
      const title = (await page.locator(`#${view} h1`).textContent()) ?? "";
      await expect(page).toHaveTitle(view === "inicio"
        ? "Ary la Cotorra · Descubre lo nuestro"
        : `${title.replace(/\s+/g, " ")} · Ary`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const stem = `${screenshots}/${view}-${width}`;
      const raw = await capture(page, `${stem}-${testInfo.project.name}.png`);

      if (testInfo.project.name === "app") {
        const legacy = await browser.newPage({ viewport: { width, height: 900 } });
        try {
          await legacy.goto(`http://127.0.0.1:3001/#${view}`);
          await ready(legacy);
          const reference = PNG.sync.read(await legacy.screenshot({ fullPage: true, animations: "disabled" }));
          // Only the single explicitly approved entry is excluded. Raw app images retain it.
          let actual = raw;
          if (view === "inicio") {
            await page.locator(".experience-entry").evaluate((entry) => entry.remove());
            actual = await capture(page, `${stem}-compared.png`);
          }
          expect({ width: actual.width, height: actual.height }).toEqual({ width: reference.width, height: reference.height });
          const diff = new PNG({ width: actual.width, height: actual.height });
          const changed = pixelmatch(reference.data, actual.data, diff.data, actual.width, actual.height, { threshold: 0.1 });
          await writeFile(`${stem}-diff.png`, PNG.sync.write(diff, { deflateLevel: 9 }));
          const ratio = changed / (actual.width * actual.height);
          await writeFile(`${stem}-comparison.json`, JSON.stringify({ width, view, changed, pixels: actual.width * actual.height, ratio, maximumRatio: 0.001, excluded: view === "inicio" ? ".experience-entry" : null }, null, 2) + "\n");
          expect(ratio, "fracción de píxeles distintos frente al legacy vivo").toBeLessThanOrEqual(0.001);
        } finally {
          await legacy.close();
        }
      }
    });
  }
}

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
  await expect(page.locator("#download-request")).toBeFocused();
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

test("API, cabeceras, recursos y entradas de etapa 2", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name === "legacy", "Superficies nuevas de la etapa 1");
  const healthResponse = await request.get("/api/health");
  // Stage 2 intentionally changes the production contract: no database => safe 503.
  expect(healthResponse.status()).toBe(503);
  expect(await healthResponse.json()).toMatchObject({ status: "degraded", error: "database_not_configured", version: "0.1.0", checks: { email: "dry_run", robot: "simulator" } });
  expect(healthResponse.headers()["cache-control"]).toBe("no-store");
  for (const path of ["/", "/index.html", "/brochure.html", "/site/landing.css", "/site/landing.js", "/favicon.ico", "/api/health", "/experiencia", "/kiosco"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(path === "/api/health" ? 503 : 200);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers()["content-security-policy"]).not.toContain("unsafe-eval");
    expect(response.headers()["x-powered-by"]).toBeUndefined();
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#inicio");
    await expect(page.locator(".experience-entry")).toHaveCount(1);
    await page.locator(".experience-entry a").click();
    await expect(page).toHaveURL(/\/experiencia$/);
    await expect(page.getByRole("heading", { name: "Empieza tu experiencia" })).toBeVisible();
    // Next.js adds its own empty route-announcer alert; target the app notice.
    await expect(page.getByRole("alert").filter({ hasText: "servicio no está disponible" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Conocer el acceso para kiosco" }).click();
    await expect(page).toHaveURL(/\/kiosco$/);
    await expect(page.locator("main")).toContainText("Simulador");
    await expect(page.locator("main")).toContainText("Modo demostración sin dispositivo");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Volver a la web de Ary" }).click();
    await expect(page.locator("#inicio")).toBeVisible();
  }
});
