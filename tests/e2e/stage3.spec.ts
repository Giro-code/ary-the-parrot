import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const evidence = "docs/screenshots/stage3";
const address = () => `e2e-${randomUUID()}@example.invalid`;
test.beforeEach(async ({ context }) => {
  // Isolate persistent client limits between synthetic test cases; no real client IPs.
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `2001:db8::${suffix.slice(0, 4)}:${suffix.slice(4)}` });
});
async function requestRecovery(page: Page, email: string) {
  await page.goto("/reingresar");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
  await expect(page.getByLabel(/También quiero novedades/)).toHaveCount(0);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Solicitar enlace de acceso" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Modo prueba: el correo no se envió" })).toBeVisible();
  await page.getByRole("link", { name: "Abrir bandeja de prueba" }).click();
  const message = page.locator('article[data-template="recovery"]').filter({ hasText: email });
  await expect(message).toHaveCount(1);
  return (await message.getByRole("link", { name: "Abrir enlace", exact: true }).getAttribute("href"))!;
}
async function verifiedAccount(page: Page) {
  const email = address(), link = await requestRecovery(page, email);
  await page.goto(link); await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page).toHaveURL(/\/mi-viaje$/); return email;
}
async function fillInquiry(page: Page) {
  await page.goto("/#solicitar");
  await page.locator("#name").fill("Solicitante sintético"); await page.locator("#org").fill("Hotel de prueba");
  await page.locator("#email").fill(address()); await page.locator("#place").selectOption({ label: "Hotel" });
  await page.locator("#message").fill("Nos interesa una demostración cultural de prueba.");
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true, animations: "disabled" });
}
test("Flow B: save, dry-run outbox, confirm on a different device and recover My trip", async ({ page, browser }) => {
  await page.goto("/experiencia"); await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.getByRole("button", { name: "gastronomía", exact: true }).click();
  await page.getByRole("button", { name: "Ver recomendaciones" }).click();
  const mangu = page.locator("article").filter({ has: page.getByRole("heading", { name: "Mangú", exact: true }) });
  await mangu.getByRole("button", { name: "Guardar ficha", exact: true }).click();
  await expect(mangu.getByRole("button", { name: "Ficha guardada", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Mi viaje", exact: true }).first().click();
  await page.getByRole("link", { name: "Guardar mi experiencia y recibir un enlace por correo" }).click();
  const email = address();
  // requestRecovery navigates to the same recovery form but preserves the source cookie.
  const link = await requestRecovery(page, email);
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const phone = await mobile.newPage(); await phone.goto(link);
    expect((await mobile.request.get("http://127.0.0.1:3002/api/visitor/me")).status()).toBe(401);
    await phone.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(phone).toHaveURL("http://127.0.0.1:3002/mi-viaje");
    await expect(phone.getByRole("heading", { name: "Mangú", exact: true })).toBeVisible();
    await capture(phone, "flow-b-mobile-recovered");
    expect((await page.request.get("/api/visitor/me")).status()).toBe(401);
    const stranger = await browser.newContext();
    try { expect((await stranger.request.get("http://127.0.0.1:3002/api/saved")).status()).toBe(401); const replay = await stranger.newPage(); await replay.goto(link); await replay.getByRole("button", { name: "Confirmar", exact: true }).click(); await expect(replay.getByRole("alert").filter({ hasText: "El enlace no está disponible" })).toBeVisible(); }
    finally { await stranger.close(); }
  } finally { await mobile.close(); }
});
test("commercial inquiry confirms reference, test email truth and retained TXT", async ({ page }) => {
  await fillInquiry(page);
  await page.getByRole("button", { name: "Preparar solicitud" }).click();
  await page.getByLabel("Autorizo tratar estos datos", { exact: false }).check();
  await page.getByRole("button", { name: "Enviar solicitud", exact: true }).click();
  await expect(page.locator("#request-result")).toContainText(/Guardada en modo prueba · ARY-\d{4}-[A-F0-9]{8}/);
  await expect(page.locator("#request-result")).toContainText("el correo no se envió");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download-request").click()]);
  expect(download.suggestedFilename()).toBe("Solicitud-Ary-la-Cotorra.txt");
  expect(await readFile((await download.path())!, "utf8")).toContain("Referencia de registro: ARY-");
});
test("commercial backend error offers retry and TXT; retry succeeds with the same request", async ({ page }) => {
  await fillInquiry(page);
  await page.route("**/api/commercial/inquiries", route => route.abort("failed"));
  await page.getByRole("button", { name: "Preparar solicitud" }).click();
  await page.getByLabel("Autorizo tratar estos datos", { exact: false }).check();
  await page.getByRole("button", { name: "Enviar solicitud", exact: true }).click();
  await expect(page.locator("#request-result")).toContainText("No se pudo enviar");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download-request").click()]);
  expect(await readFile((await download.path())!, "utf8")).toContain("Esta solicitud no se ha enviado.");
  await page.unroute("**/api/commercial/inquiries"); await page.getByRole("button", { name: "Reintentar envío" }).click();
  await expect(page.locator("#request-result")).toContainText("Guardada en modo prueba · ARY-");
});
test("privacy exports authenticated JSON and deletes account/session", async ({ page }) => {
  const email = await verifiedAccount(page); await page.goto("/cuenta/privacidad");
  await expect(page.locator(".account-email")).toHaveText(email);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar mis datos (JSON)" }).click()]);
  const data = JSON.parse(await readFile((await download.path())!, "utf8")); expect(data.account.email).toBe(email); expect(data).toHaveProperty("consents");
  await expect(page.getByRole("button", { name: "Borrar mis datos definitivamente" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Entiendo y quiero borrar mi cuenta y mis datos." }).check();
  await page.getByRole("button", { name: "Borrar mis datos definitivamente" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Tu cuenta y tus datos operativos se borraron" })).toBeVisible();
  expect((await page.request.get("/api/visitor/me")).status()).toBe(401);
  await page.reload(); await expect(page.getByRole("link", { name: "Recuperar Mi viaje", exact: true })).toBeVisible();
});
test("production outbox is 404 and B2B without a database fails honestly", async ({ request }) => {
  expect((await request.get("http://127.0.0.1:3000/dev/outbox")).status()).toBe(404);
  // No cookies or private messages can be returned in production.
  const response = await request.post("http://127.0.0.1:3000/api/commercial/inquiries", { headers: { origin: "http://127.0.0.1:3000", "x-ary-request": "1", "idempotency-key": randomUUID() }, data: { name: "Synthetic", org: "Hotel", email: address(), place: "Hotel", message: "Synthetic request; never send mail.", locale: "es", consentVersion: "2026-11-07.v1", treatmentConsent: true } });
  expect(response.status()).toBe(503);
});
for (const pass of [1, 2]) test(`stage3 visual evidence ${pass}: desktop/mobile, errors, verified privacy`, async ({ page }) => {
  test.setTimeout(120000);
  await verifiedAccount(page);
  for (const width of [360, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["reingresar", "cuenta/privacidad", "privacidad", "dev/outbox"]) {
      await page.goto(`/${route}`); await page.reload(); await expect(page.locator("h1")).toBeVisible();
      if (route === "cuenta/privacidad") await expect(page.locator(".account-email")).toBeVisible();
      await capture(page, `pass-${pass}-${route.replaceAll("/", "-")}-${width}`);
    }
    await page.goto(`/auth/verify?token=${"A".repeat(43)}`); await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "El enlace no está disponible" })).toBeVisible(); await capture(page, `pass-${pass}-verify-error-${width}`);
    await page.goto("/reingresar");
    await page.getByRole("button", { name: "English", exact: true }).click(); await expect(page.locator("h1")).toHaveText("Save and recover My trip");
    await capture(page, `pass-${pass}-recovery-en-${width}`);
    await fillInquiry(page); await page.route("**/api/commercial/inquiries", route => route.abort("failed"));
    await page.getByRole("button", { name: "Preparar solicitud" }).click();
  await page.getByLabel("Autorizo tratar estos datos", { exact: false }).check();
  await page.getByRole("button", { name: "Enviar solicitud", exact: true }).click();
    await expect(page.locator("#request-result")).toContainText("No se pudo enviar"); await capture(page, `pass-${pass}-commercial-error-${width}`);
    await page.unroute("**/api/commercial/inquiries"); await page.getByRole("button", { name: "Reintentar envío" }).click();
    await expect(page.locator("#request-result")).toContainText("Guardada en modo prueba · ARY-"); await capture(page, `pass-${pass}-commercial-received-${width}`);
  }
  // These screenshots require human inspection; generation alone is not a visual pass.
});
