import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const base = "http://127.0.0.1:3002", evidence = "docs/screenshots/stage4b";
const ids = { a: "4b000000-0000-4000-8000-000000000002", b: "4b000000-0000-4000-8000-000000000003" };
type State = Awaited<ReturnType<BrowserContext["storageState"]>>;
let aState: State, bState: State, adminState: State;
async function staffLogin(page: Page, email: string) {
  await page.goto("/admin/entrar"); await page.getByLabel("Correo de personal").fill(email);
  await expect(async () => { await page.getByRole("button", { name: "Solicitar enlace de acceso", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Si tienes una membresía activa" })).toBeVisible(); }).toPass({ timeout: 20000 });
  await page.goto("/dev/outbox"); const article = page.locator("article").filter({ hasText: email }).filter({ hasText: "Acceso del personal" }).first();
  const href = await article.locator('a[href*="/admin/entrar?token="]').first().getAttribute("href"); expect(href).toBeTruthy(); await page.goto(href!);
  await expect(async () => { await page.getByRole("button", { name: "Confirmar acceso de personal", exact: true }).click(); await expect(page).not.toHaveURL(/\/admin\/entrar/); }).toPass({ timeout: 20000 });
}
async function recoverVisitor(page: Page) {
  const email = `lead-${randomUUID()}@example.invalid`;
  await page.goto("/reingresar"); await page.getByLabel("Correo electrónico").fill(email); await page.getByRole("checkbox", { name: "Solicito conservar Mi viaje", exact: false }).check();
  await expect(async () => { await page.getByRole("button", { name: "Solicitar enlace de acceso", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Modo prueba" })).toBeVisible(); }).toPass({ timeout: 20000 });
  await page.goto("/dev/outbox"); const recovery = page.locator('article[data-template="recovery"]').filter({ hasText: email }).first(); const link = await recovery.getByRole("link", { name: "Abrir enlace", exact: true }).getAttribute("href"); await page.goto(link!);
  await expect(async () => { await page.getByRole("button", { name: "Confirmar", exact: true }).click(); await expect(page).toHaveURL(`${base}/mi-viaje`); }).toPass({ timeout: 20000 }); return email;
}
test.beforeAll(async ({ browser }) => {
  test.setTimeout(120000);
  for (const [email, assign] of [["admin.demo@example.invalid", (s: State) => { adminState = s; }], ["provider-a.demo@example.invalid", (s: State) => { aState = s; }], ["provider-b.demo@example.invalid", (s: State) => { bState = s; }]] as const) {
    const context = await browser.newContext({ locale: "es-ES", baseURL: base }); try { const page = await context.newPage(); await staffLogin(page, email); assign(await context.storageState()); } finally { await context.close(); }
  }
});
test("staff outbox login shows aggregate sample, suppression and CSV without PII", async ({ page, context }) => {
  await context.addCookies(adminState.cookies); await page.goto("/admin"); await expect(page.getByRole("heading", { name: "Analítica agregada" })).toBeVisible(); await expect(page.getByText("Tamaño de la muestra:", { exact: false })).toBeVisible(); await expect(page.getByRole("cell", { name: "<10", exact: true }).first()).toBeVisible();
  const href = await page.getByRole("link", { name: "Exportar agregados CSV" }).getAttribute("href"); const csv = await (await page.request.get(href!)).text(); expect(csv).toContain("<10"); expect(csv).not.toContain("@example.invalid"); expect(csv).not.toContain("chatMessages");
});
test("provider A sees only A and cannot query B or escalate to admin", async ({ page, context }) => {
  await context.addCookies(aState.cookies); await page.goto(`/partner/ofertas?organizationId=${ids.a}`); await expect(page.getByRole("heading", { name: "Ofertas y experiencias" })).toBeVisible(); await expect(page.getByText("DEMO · Experiencia de Demo Taller del Caribe", { exact: false })).toBeVisible(); await expect(page.getByText("Demo Paseo Cultural", { exact: false })).toHaveCount(0);
  expect((await page.request.get(`/api/partner/offers?organizationId=${ids.b}`)).status()).toBe(403);
  await page.goto(`/partner/ofertas?organizationId=${ids.b}`); await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
  expect((await page.request.post("/api/admin/devices", { headers: { origin: base, "x-ary-request": "1" }, data: { label: "Forbidden" } })).status()).toBe(403);
});
test("visitor chooses fields for P, P reads only them, revocation removes future access", async ({ page, browser }) => {
  const email = await recoverVisitor(page);
  await page.getByRole("button", { name: "Enviar mi solicitud a Demo Taller del Caribe (ficticio)", exact: true }).click();
  const form = page.locator("form").filter({ has: page.getByRole("heading", { name: "Confirma destinatario y campos" }) });
  await expect(form.getByRole("checkbox", { name: "Nombre", exact: true })).not.toBeChecked(); await form.getByRole("checkbox", { name: "Correo verificado", exact: false }).check(); await form.getByRole("checkbox", { name: "Mensaje", exact: true }).check(); await form.getByLabel("Mensaje", { exact: true }).last().fill("Consulta sintética elegida"); await form.getByRole("checkbox", { name: "Autorizo compartir", exact: false }).check(); await form.getByRole("button", { name: "Confirmar y enviar solicitud" }).click(); await expect(page.getByRole("status").filter({ hasText: "Solicitud registrada" })).toBeVisible();
  const partner = await browser.newContext({ locale: "es-ES", baseURL: base, storageState: aState });
  try { const inbox = await partner.newPage(); await inbox.goto(`/partner/leads?organizationId=${ids.a}`); const lead = inbox.locator("article").filter({ hasText: "Consulta sintética elegida" }); await expect(lead).toContainText(email); await expect(lead.locator("dt")).toHaveText(["Correo verificado", "Mensaje"]); await page.goto("/cuenta/privacidad"); const shared = page.locator("article").filter({ hasText: "Demo Taller del Caribe (ficticio)" }).last(); await shared.getByRole("button", { name: "Revocar solicitud" }).click(); await expect(shared).toContainText("Revocada"); await inbox.reload(); await expect(inbox.getByText("Consulta sintética elegida")).toHaveCount(0); }
  finally { await partner.close(); }
});
test("CMS draft → review → published with a synthetic already-checked source fixture", async ({ page, context }) => {
  await context.addCookies(adminState.cookies); await page.goto("/admin/contenidos"); const item = page.locator("article").filter({ has: page.getByRole("heading", { name: "DEMO · Borrador CMS de prueba · es", exact: true }) });
  await expect(item.getByRole("button", { name: "Publicar", exact: true })).toBeDisabled(); await item.getByRole("button", { name: "Enviar a revisión" }).click(); await expect(item).toContainText("review"); await item.getByRole("button", { name: "Publicar", exact: true }).click(); await expect(item).toContainText("published"); await item.getByRole("button", { name: "Vista previa" }).click(); await expect(page.getByRole("region", { name: "Vista previa de ficha" })).toContainText("Solo fixture de pruebas");
});
for (const pass of [1, 2]) test(`stage4b visual evidence pass ${pass} desktop/mobile and alternative states`, async ({ page, context }) => {
  test.setTimeout(180000); await context.addCookies(adminState.cookies); await mkdir(evidence, { recursive: true }); await recoverVisitor(page);
  for (const width of [360, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/admin", "/admin/dispositivos", "/admin/contenidos", "/admin/organizaciones", "/admin/campanas", "/admin/solicitudes", "/admin/privacidad"]) {
      await page.goto(path); await page.reload(); await expect(page.locator("h1")).toBeVisible(); await expect(page.getByRole("status").filter({ hasText: "Cargando" })).toHaveCount(0); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `${evidence}/pass-${pass}-${path.replaceAll("/", "-")}-${width}.png`, fullPage: true });
    }
    await context.addCookies(aState.cookies); for (const path of ["/partner", "/partner/ofertas", "/partner/leads"]) { await page.goto(`${path}?organizationId=${ids.a}`); await page.reload(); await expect(page.locator("h1")).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `${evidence}/pass-${pass}-${path.replaceAll("/", "-")}-${width}.png`, fullPage: true }); }
    await context.addCookies(bState.cookies); await page.goto("/admin/contenidos"); await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible(); await page.screenshot({ path: `${evidence}/pass-${pass}-forbidden-${width}.png`, fullPage: true }); await context.addCookies(adminState.cookies);
    await page.goto("/mi-viaje"); await page.getByRole("button", { name: "Enviar mi solicitud a Demo Taller del Caribe (ficticio)", exact: true }).click();
    const confirmation = page.locator("form").filter({ has: page.getByRole("heading", { name: "Confirma destinatario y campos" }) }); await confirmation.getByRole("checkbox", { name: "Correo verificado", exact: false }).check(); await confirmation.getByRole("checkbox", { name: "Mensaje", exact: true }).check(); await confirmation.getByLabel("Mensaje", { exact: true }).last().fill(`DEMO visual ${pass}-${width}`); await confirmation.getByRole("checkbox", { name: "Autorizo compartir", exact: false }).check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `${evidence}/pass-${pass}-lead-confirmation-${width}.png`, fullPage: true });
    await page.route("**/api/visitor/leads", route => route.abort("failed")); await confirmation.getByRole("button", { name: "Confirmar y enviar solicitud" }).click(); await expect(page.getByRole("alert").filter({ hasText: "No se pudo completar" })).toBeVisible(); await page.screenshot({ path: `${evidence}/pass-${pass}-lead-error-${width}.png`, fullPage: true }); await page.unroute("**/api/visitor/leads");
    await confirmation.getByRole("button", { name: "Confirmar y enviar solicitud" }).click(); await expect(page.getByRole("status").filter({ hasText: "Solicitud registrada" })).toBeVisible(); await page.goto("/cuenta/privacidad"); await expect(page.locator(".account-email")).toBeVisible(); const shared = page.locator("article.staff-record").filter({ hasText: "Demo Taller del Caribe" }).last(); await shared.getByRole("button", { name: "Revocar solicitud" }).click(); await expect(shared).toContainText("Revocada"); await page.screenshot({ path: `${evidence}/pass-${pass}-lead-revoked-${width}.png`, fullPage: true });
  }
  await page.goto(`/admin/entrar?token=${"A".repeat(43)}`); await page.getByRole("button", { name: "Confirmar acceso de personal" }).click(); await expect(page.getByRole("alert").filter({ hasText: "El enlace no está disponible" })).toBeVisible(); await page.screenshot({ path: `${evidence}/pass-${pass}-expired-link.png`, fullPage: true });
  // A reviewer must LOOK at these captures and exercise controls. Generation is not a visual review.
});
