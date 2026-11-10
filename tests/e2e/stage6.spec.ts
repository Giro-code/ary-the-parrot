import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { askText, mockSpeech, startChat } from "./voice-helpers";
const evidence = "docs/screenshots/stage6";
test.beforeEach(async ({ page, context }) => { await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage6-${randomUUID()}` }); await mockSpeech(page, 2); });
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true, animations: "disabled" });
}
async function mockAsk(page: Page) {
  const { items } = await (await page.request.get("/api/cultural/items?locale=es")).json();
  const item = items.find((row: { title: string }) => /merengue/i.test(row.title)) || items[0];
  await page.route("**/api/voice/ask", route => route.fulfill({ json: { messageId: randomUUID(), transcript: "Cuéntame sobre el merengue", displayText: "El merengue es música y baile de República Dominicana.", spokenText: "El merengue es música y baile de República Dominicana.", intent: "culture", citedItemIds: [item.id], followUps: [], confidence: .9, mode: "gemini", handoff: false, preferences: { locale: "es", countryDeclared: null, interests: ["music"] }, sources: [{ id: item.id, title: item.title, summary: item.summary, url: item.sourceUrl, editor: item.editor }] } }));
}
test("no automatic session or recording, explicit permission explanation, real recording and transcript bubble", async ({ page }) => {
  let sessions = 0, recordings = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/visitor/session")) sessions++; if (request.url().endsWith("/api/voice/ask")) recordings++; });
  await page.goto("/kiosco"); await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click(); expect(sessions).toBe(0); expect(recordings).toBe(0);
  await mockAsk(page); await startChat(page);
  await page.getByRole("button", { name: "Hablar con Ary", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Google Gemini"); expect(recordings).toBe(0);
  await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  await expect(page.getByRole("button", { name: "Parar grabación" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-robot-state", "listening");
  await page.waitForTimeout(350); // Actual fake-device recording, not a synthetic recognition callback.
  await page.getByRole("button", { name: "Parar grabación" }).click();
  await expect(page.locator(".chat-message.user").last()).toHaveText(/Cuéntame sobre el merengue/);
  await expect(page.locator(".chat-card")).toBeVisible(); expect(recordings).toBe(1);
  await page.getByRole("button", { name: "Terminar sin continuar" }).click();
  await expect(page.locator(".chat-card")).toHaveCount(0);
});
test("15-second cap stops recording, audio is interrupted and mute prevents new TTS", async ({ page }) => {
  await mockAsk(page); await startChat(page); await page.clock.install();
  await page.getByRole("button", { name: "Hablar con Ary", exact: true }).click();
  await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  expect(await page.locator("audio").evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await page.clock.runFor(15100); await expect(page.getByRole("button", { name: "Hablar con Ary", exact: true })).toBeVisible();
  await expect(page.locator(".chat-message.user").last()).toContainText("merengue");
  await page.getByRole("button", { name: "Silenciar voz de Ary" }).click();
  let calls = 0; page.on("request", request => { if (request.url().endsWith("/api/voice/speak")) calls++; });
  await askText(page, "Cuéntame del mangú"); await expect(page.locator(".chat-message.assistant").filter({ hasText: /mangú/i }).last()).toBeVisible(); expect(calls).toBe(0);
});
test("denied microphone and failed TTS offer the keyboard and accessible captions", async ({ page, context }) => {
  await context.clearPermissions();
  await context.grantPermissions([]);
  // A deterministic denial tests the browser permission failure path without an OS prompt.
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); }; });
  await page.unroute("**/api/voice/speak"); await page.route("**/api/voice/speak", route => route.fulfill({ status: 503, json: { error: "voice_unavailable" } }));
  await startChat(page, true);
  await expect(page.getByRole("status").filter({ hasText: "Ahora no puedo hablar" })).toBeVisible();
  await page.getByRole("button", { name: "Hablar con Ary", exact: true }).click(); await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "No se permitió el micrófono" })).toBeVisible();
  await askText(page, "Cuéntame del merengue"); await expect(page.locator(".chat-message.assistant").last()).toContainText(/merengue/i);
});

test("keyboard cancels recording and releases every microphone track without uploading", async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      Object.assign(window, { aryTestTracks: stream.getTracks() });
      return stream;
    };
  });
  let uploads = 0;
  page.on("request", request => { if (request.url().endsWith("/api/voice/ask")) uploads++; });
  await startChat(page);
  await page.getByRole("button", { name: "Hablar con Ary", exact: true }).click();
  await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  await expect(page.getByRole("button", { name: "Parar grabación" })).toBeVisible();
  await page.getByRole("button", { name: "Usar teclado", exact: true }).click();
  await expect(page.getByLabel("Tu pregunta cultural", { exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as Window & { aryTestTracks?: MediaStreamTrack[] }).aryTestTracks?.every(track => track.readyState === "ended"))).toBe(true);
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-robot-state", "idle");
  expect(uploads).toBe(0);
});

test("mute preserves an active recording and leaves the next question usable", async ({ page }) => {
  await mockAsk(page); await startChat(page);
  await page.getByRole("button", { name: "Hablar con Ary", exact: true }).click();
  await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  await page.getByRole("button", { name: "Silenciar voz de Ary" }).click();
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-robot-state", "listening");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Parar grabación" }).click();
  await expect(page.locator(".chat-message.user").last()).toContainText("merengue");
  await expect(page.getByRole("button", { name: "Hablar con Ary", exact: true })).toBeEnabled();
  await askText(page, "Cuéntame del mangú");
  await expect(page.locator(".chat-message.assistant").filter({ hasText: /mangú/i }).last()).toBeVisible();
});

test("invalid playback reports the text fallback and never leaves Ary speaking", async ({ page }) => {
  await page.unroute("**/api/voice/speak");
  await page.route("**/api/voice/speak", route => route.fulfill({ contentType: "audio/wav", body: "invalid audio" }));
  await startChat(page);
  await expect(page.getByRole("status").filter({ hasText: "Ahora no puedo hablar" })).toBeVisible();
  await expect(page.getByTestId("robot-status")).toHaveAttribute("data-robot-state", "idle");
});
test("permissions policy restricts microphone to conversation routes; CSP supports local audio", async ({ request }) => {
  for (const path of ["/", "/privacidad", "/kiosco/activar", "/mi-viaje", "/kiosco", "/experiencia"]) {
    const response = await request.get(path), policy = response.headers()["permissions-policy"];
    expect(policy).toContain(path === "/kiosco" || path === "/experiencia" ? "microphone=(self)" : "microphone=()");
    expect(response.headers()["content-security-policy"]).toContain("media-src 'self' blob:");
  }
});
for (const pass of [1, 2]) test(`stage6 visual evidence pass ${pass}: character states and conversation`, async ({ page, context }) => {
  test.setTimeout(180000);
  for (const [width, height] of [[1280, 800], [1920, 1080], [390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height }); await page.goto("/kiosco"); await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click();
    await page.reload(); await expect(page.locator('[data-state="idle"]')).toBeVisible();
    await capture(page, `pass-${pass}-presentar-${width}`);
    await startChat(page); await mockAsk(page);
    await page.getByRole("button", { name: "Hablar con Ary", exact: true }).click(); await page.getByRole("button", { name: "Acepto · Grabar" }).click();
    await expect(page.locator('[data-ary-image="pensar"]')).toBeVisible(); await capture(page, `pass-${pass}-escuchando-${width}`);
    await page.getByRole("button", { name: "Parar grabación" }).click();
    await expect(page.locator(".chat-card")).toBeVisible(); await expect(page.locator('[data-ary-image="mostrar"]')).toBeVisible(); await capture(page, `pass-${pass}-hablando-fichas-${width}`);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator('[data-ary-image="celebrar"]')).toBeVisible(); await capture(page, `pass-${pass}-celebrar-${width}`);
    await context.setOffline(true); await expect(page.locator('[data-ary-image="sin-conexion"]')).toBeVisible(); await capture(page, `pass-${pass}-offline-fallback-${width}`);
    await expect(page.getByRole("button", { name: "Hablar con Ary", exact: true })).toBeDisabled();
    await context.setOffline(false); await page.getByRole("button", { name: "Terminar sin continuar" }).click();
    await startChat(page, true); await askText(page, "¿Dónde está mi vuelo?"); await capture(page, `pass-${pass}-movil-redireccion-${width}`);
    await page.getByRole("button", { name: "Finalizar mi sesión" }).click(); await page.reload();
  }
  // Captures are evidence for human inspection; this test alone is not a visual review.
});
