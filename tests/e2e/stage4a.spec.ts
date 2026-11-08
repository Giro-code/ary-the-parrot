import { test, expect, type Page } from "@playwright/test";
import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";

const evidence = "docs/evidence/stage4a";
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage4a-${randomUUID()}` });
});
async function recommendations(page: Page, mobile = false) {
  await page.goto(mobile ? "/experiencia" : "/kiosco");
  if (!mobile) await expect(page.getByRole("status").filter({ hasText: "Servicio disponible" })).toBeVisible();
  await expect(async () => {
    const start = page.getByRole("button", { name: "Iniciar", exact: true });
    if (await start.isVisible()) await start.click();
    await expect(page.getByRole("heading", { name: mobile ? "¿Qué te gustaría descubrir?" : "Elige tu idioma", exact: true })).toBeVisible();
  }).toPass();
  if (!mobile) await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "música", exact: true }).click();
  await page.getByRole("button", { name: "Ver recomendaciones", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pregúntale a Ary" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cuéntame sobre el merengue", exact: true })).toBeEnabled();
}
async function ask(page: Page, message: string) {
  await page.getByLabel("Tu pregunta cultural", { exact: true }).fill(message);
  await page.getByRole("button", { name: "Enviar pregunta", exact: true }).click();
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true, animations: "disabled" });
}
test("kiosk without bridge keeps its flow and demo chat cites a source and routes sensitive topics", async ({ page }) => {
  await recommendations(page);
  await expect(page.getByTestId("robot-status")).toContainText("no conectado");
  await expect(page.locator(".ary-chat .mode")).toHaveText("Respuestas de ejemplo");
  await page.getByRole("button", { name: "Cuéntame sobre el merengue", exact: true }).click();
  await expect(page.locator(".chat-message.assistant")).toContainText("merengue");
  await expect(page.locator(".chat-sources a").first()).toHaveAttribute("href", /^https:\/\//);
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-gesture", "talk");
  await ask(page, "¿Cuál es la puerta de mi vuelo?");
  await expect(page.locator(".chat-message.assistant").last()).toContainText("personal del aeropuerto");
  await expect(page.locator(".chat-message.assistant").last()).toContainText("Respuestas de ejemplo");
  await page.getByRole("button", { name: "Terminar sin continuar", exact: true }).click();
  await expect(page.locator(".ary-chat")).toHaveCount(0);
});
test("mobile conversation continues on reload and plain text never becomes HTML", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await recommendations(page, true); await ask(page, "Cuéntame del merengue");
  await expect(page.locator(".chat-message.assistant")).toHaveCount(1);
  await page.reload(); await expect(page.locator(".chat-message.assistant")).toHaveCount(1);
  await expect(page.locator(".chat-message.user")).toContainText("Cuéntame del merengue");
  await page.route("**/api/chat", route => route.request().method() === "POST" ? route.fulfill({ json: { answer: '<img src=x onerror="window.__injected=true">', citedItemIds: [], followUps: [], confidence: 0, mode: "demo", handoff: false, sources: [] } }) : route.continue());
  await ask(page, "Otra pregunta");
  await expect(page.locator(".chat-message.assistant").last()).toContainText("<img");
  await expect(page.locator(".chat-message img")).toHaveCount(0);
  expect(await page.evaluate(() => "__injected" in window)).toBe(false);
});
test("chat presents real waiting, service error and limit states", async ({ page }) => {
  await recommendations(page);
  let release!: () => void;
  const pending = new Promise<void>(done => { release = done; });
  await page.route("**/api/chat", async route => {
    if (route.request().method() !== "POST") return route.continue();
    await pending; await route.fulfill({ status: 503, json: { error: "service_unavailable" } });
  });
  await ask(page, "Merengue");
  await expect(page.getByRole("status").filter({ hasText: "Ary está pensando" })).toBeVisible();
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-gesture", "ponder");
  release(); await expect(page.getByRole("alert").filter({ hasText: "Ary no pudo responder" })).toBeVisible();
  await page.unroute("**/api/chat");
  await page.route("**/api/chat", route => route.fulfill({ status: 429, json: { error: "rate_limited" } }));
  await page.getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Límite de mensajes alcanzado" })).toBeVisible();
});
test("cold kiosk checks connection and retries the first failed healthcheck after one second", async ({ page }) => {
  await page.clock.install();
  let release!: () => void, releaseRetry!: () => void, attempts = 0;
  const first = new Promise<void>(done => { release = done; });
  // Hold the retry too: the offline state only lasts ~1 s, which polling can otherwise miss.
  const retry = new Promise<void>(done => { releaseRetry = done; });
  await page.route("**/api/health", async route => {
    attempts++;
    if (attempts === 1) { await first; await route.fulfill({ status: 503, json: { status: "degraded" } }); }
    else { await retry; await route.continue(); }
  });
  await page.goto("/kiosco");
  await expect(page.getByRole("status").filter({ hasText: "Comprobando conexión" })).toBeVisible();
  await expect(page.getByText("Modo demostración sin dispositivo", { exact: true })).toHaveCount(0);
  release(); await expect(page.getByRole("status").filter({ hasText: "Sin conexión" })).toBeVisible();
  releaseRetry(); await page.clock.fastForward(1100);
  await expect(page.getByRole("status").filter({ hasText: "Servicio disponible" })).toBeVisible();
  expect(attempts).toBeGreaterThanOrEqual(2);
});
test("B2B preparation shows integrated consent and makes zero requests before it is checked", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/commercial/inquiries")) requests++; });
  await page.goto("/#solicitar");
  await expect(page.getByLabel("Autorizo tratar estos datos", { exact: false })).toBeHidden();
  await page.locator("#name").fill("Synthetic applicant"); await page.locator("#org").fill("Test hotel");
  await page.locator("#email").fill(`${randomUUID()}@example.invalid`); await page.locator("#place").selectOption("Hotel");
  await page.locator("#message").fill("Synthetic cultural demonstration request.");
  await page.getByRole("button", { name: "Preparar solicitud" }).click();
  await expect(page.locator("#request-result")).toBeFocused();
  const consent = page.getByLabel("Autorizo tratar estos datos", { exact: false });
  await expect(consent).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Enviar solicitud", exact: true })).toBeDisabled();
  await expect(page.locator("#download-request")).toBeEnabled(); expect(requests).toBe(0);
  await expect(page.locator("#request-result a")).toHaveAttribute("href", "/privacidad");
  await consent.check(); await page.getByRole("button", { name: "Enviar solicitud", exact: true }).click();
  await expect(page.locator("#request-result")).toContainText("Guardada en modo prueba"); expect(requests).toBe(1);
});
test("simulated local SSE presence welcomes without creating a visitor session", async ({ page }) => {
  let stream: ServerResponse | undefined;
  const received: unknown[] = [];
  const server = createServer((request, response) => {
    const headers = { "Access-Control-Allow-Origin": "http://127.0.0.1:3002", "Access-Control-Allow-Headers": "authorization,content-type,x-forwarded-for", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Private-Network": "true" };
    if (request.method === "OPTIONS") { response.writeHead(204, headers); response.end(); return; }
    if (request.headers.authorization !== "Bearer synthetic-e2e-token") { response.writeHead(401, headers); response.end(); return; }
    if (request.url === "/events") {
      stream = response; response.writeHead(200, { ...headers, "Content-Type": "text/event-stream" });
      response.write('data: {"type":"hardware","status":"simulated"}\n\n');
    } else {
      let body = ""; request.on("data", part => { body += part; });
      request.on("end", () => { received.push(JSON.parse(body)); response.writeHead(200, headers); response.end('{"accepted":true}'); });
    }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(8765, "127.0.0.1", resolve); });
  try {
    await page.route("**/api/kiosk/me", route => route.fulfill({ json: { authorized: true } }));
    await page.route("**/api/kiosk/bridge-token", route => route.fulfill({ json: { token: "synthetic-e2e-token" } }));
    let sessions = 0;
    page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/visitor/session")) sessions++; });
    await page.goto("/kiosco"); await expect(page.getByRole("status").filter({ hasText: "Servicio disponible" })).toBeVisible();
    await expect.poll(() => !!stream).toBe(true);
    stream!.write('data: {"type":"sensor","sensor":"presence","value":true}\n\n');
    await expect(page.getByRole("status").filter({ hasText: "¡Bienvenido!" })).toBeVisible();
    await expect.poll(() => received.some(value => JSON.stringify(value).includes('"welcome"'))).toBe(true);
    expect(sessions).toBe(0); await expect(page.getByRole("button", { name: "Iniciar", exact: true })).toBeEnabled();
  } finally {
    await page.goto("about:blank"); stream?.end(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
for (const pass of [1, 2]) test(`stage4a visual evidence ${pass} at desktop and mobile widths`, async ({ page }) => {
  test.setTimeout(120000);
  for (const width of [360, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await recommendations(page); await ask(page, "Cuéntame del merengue");
    await expect(page.locator(".chat-message.assistant")).toHaveCount(1);
    await capture(page, `pass-${pass}-kiosk-chat-${width}`);
    await page.getByRole("button", { name: "Terminar sin continuar", exact: true }).click();
    await recommendations(page, true); await ask(page, "¿Dónde está mi vuelo?");
    await expect(page.locator(".chat-message.assistant")).toContainText("personal del aeropuerto");
    await capture(page, `pass-${pass}-mobile-handoff-${width}`);
    await page.getByRole("button", { name: "Finalizar mi sesión", exact: true }).click();
    await page.reload();
  }
  // Evidence generation requires two independent actual visual inspections.
});
