import { test, expect } from "@playwright/test";
import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { askText, mockSpeech, startChat } from "./voice-helpers";
import { questionField } from "./helpers";

test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage4a-${randomUUID()}` });
  await mockSpeech(page, 1.5);
});
test("kiosk demo chat cites published sources, speaks only during audio and routes sensitive topics", async ({ page }) => {
  await startChat(page);
  await askText(page, "Cuéntame sobre el merengue");
  // The phone-handoff offer stays pinned at the end of the chat, so look for the answer itself.
  await expect(page.locator(".chat-message.assistant").filter({ hasText: "merengue" }).last()).toBeVisible();
  await expect(page.locator(".card-source").first()).toContainText("UNESCO");
  await expect(page.locator(".chat-card a")).toHaveCount(0);
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-gesture", "talk");
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-robot-state", "idle", { timeout: 5000 });
  await askText(page, "¿Cuál es la puerta de mi vuelo?");
  await expect(page.locator(".chat-message.assistant").filter({ hasText: "personal del aeropuerto" }).last()).toBeVisible();
  await page.getByRole("button", { name: "Terminar sin continuar", exact: true }).click();
  await expect(page.locator(".chat-card")).toHaveCount(0);
  await expect(page.locator("audio")).not.toHaveAttribute("src", /blob:/);
});
test("mobile restores current-session history and renders untrusted text literally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startChat(page, true); await askText(page, "Cuéntame del merengue");
  const count = await page.locator(".chat-message.assistant").count();
  await page.reload(); await expect(page.locator(".chat-message.assistant")).toHaveCount(count);
  await expect(page.locator(".chat-message.user").last()).toContainText("Cuéntame del merengue");
  await page.route("**/api/chat", route => route.request().method() === "POST" ? route.fulfill({ json: { messageId: randomUUID(), displayText: '<img src=x onerror="window.__injected=true">', spokenText: "Test", intent: "culture", citedItemIds: [], followUps: [], confidence: 0, mode: "demo", handoff: false, sources: [] } }) : route.continue());
  await askText(page, "Otra pregunta");
  await expect(page.locator(".chat-message.assistant").last()).toContainText("<img");
  await expect(page.locator(".chat-message.assistant").last().locator(".bubble img")).toHaveCount(0);
  expect(await page.evaluate(() => "__injected" in window)).toBe(false);
});
test("chat waiting, service failure and recoverable rate limits remain usable", async ({ page }) => {
  await startChat(page);
  let release!: () => void; const pending = new Promise<void>(done => { release = done; });
  await page.route("**/api/chat", async route => { if (route.request().method() !== "POST") return route.continue(); await pending; await route.fulfill({ status: 503, json: { error: "service_unavailable" } }); });
  await expect(questionField(page)).toBeVisible();
  await questionField(page).fill("Merengue");
  await page.getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ary está pensando" })).toBeVisible();
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-gesture", "ponder");
  release(); await expect(page.getByRole("alert").filter({ hasText: "Ary no pudo responder" })).toBeVisible();
  await page.unroute("**/api/chat"); await page.route("**/api/chat", route => route.fulfill({ status: 429, json: { error: "rate_limited" } }));
  await page.getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Límite de mensajes alcanzado" })).toBeVisible();
  await expect(questionField(page)).toBeEnabled();
});
test("cold kiosk checks health and retries a failed check", async ({ page }) => {
  await page.clock.install(); let release!: () => void, releaseRetry!: () => void, attempts = 0;
  const first = new Promise<void>(done => { release = done; }), retry = new Promise<void>(done => { releaseRetry = done; });
  await page.route("**/api/health", async route => { attempts++; if (attempts === 1) { await first; await route.fulfill({ status: 503, json: { status: "degraded" } }); } else { await retry; await route.continue(); } });
  await page.goto("/kiosco"); await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Comprobando conexión" })).toBeVisible();
  await expect(page.getByText("Modo demostración sin dispositivo", { exact: true })).toHaveCount(0);
  release(); await expect(page.getByRole("status").filter({ hasText: "Sin conexión al servicio" })).toBeVisible();
  releaseRetry(); await page.clock.fastForward(1100); await expect(page.getByRole("status").filter({ hasText: "Servicio disponible" })).toBeVisible(); expect(attempts).toBeGreaterThanOrEqual(2);
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
    await page.goto("/kiosco"); await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Servicio disponible" })).toBeVisible();
    await expect.poll(() => !!stream).toBe(true);
    stream!.write('data: {"type":"sensor","sensor":"presence","value":true}\n\n');
    await expect(page.getByText("¡Bienvenido! Soy Ary.", { exact: false })).toBeVisible();
    await expect.poll(() => received.some(value => JSON.stringify(value).includes('"welcome"'))).toBe(true);
    expect(sessions).toBe(0); await expect(page.getByRole("button", { name: "Iniciar", exact: true })).toBeEnabled();
  } finally {
    await page.goto("about:blank"); stream?.end(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
