import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { emailStart, switchToChat } from "./stage8-helpers";
import { mockSpeech, askText } from "./voice-helpers";
import { questionField } from "./helpers";

test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage9d-${randomUUID()}` });
  await mockSpeech(page, .4);
});
async function startVoice(page: Page, en = false) {
  await page.locator(".voice-main-mic").click();
  await page.getByRole("button", { name: en ? "I agree · Record" : "Acepto · Grabar", exact: true }).click();
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "true");
}
async function mockAnswer(page: Page, locale = "es") {
  const { items } = await (await page.request.get(`/api/cultural/items?locale=${locale}`)).json();
  const item = items.find((row: { title: string }) => /merengue/i.test(row.title)) || items[0];
  const reply = { messageId: randomUUID(), transcript: locale === "es" ? "Cuéntame del merengue" : "Tell me about merengue", displayText: item.summary, spokenText: item.summary, intent: "culture", citedItemIds: [item.id], sources: [{ id: item.id, title: item.title, summary: item.summary, image: item.image, url: item.sourceUrl, editor: item.editor, mapsUrl: item.mapsUrl }], followUps: [locale === "es" ? "Más música" : "More music"], confidence: .9, mode: "demo", handoff: false };
  await page.route("**/api/voice/ask", route => route.fulfill({ json: reply }));
  return reply;
}
test("voice is the default; gesture, welcome, automatic listening and full captioned turn", async ({ page }) => {
  let recordings = 0; page.on("request", r => { if (r.url().endsWith("/api/voice/ask")) recordings++; });
  await emailStart(page, "es", undefined, false);
  await expect(page.getByRole("button", { name: "Hablar con Ary", exact: true })).toBeVisible();
  await expect(questionField(page)).toHaveCount(0); expect(recordings).toBe(0);
  const answer = await mockAnswer(page);
  await startVoice(page);
  await page.waitForTimeout(400);
  await page.locator(".voice-main-mic").click();
  await expect(page.locator(".chat-message.user")).toContainText(answer.transcript);
  await expect(page.locator(".chat-message.assistant")).toContainText(answer.displayText);
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "true");
  expect(recordings).toBe(1);
  await page.getByRole("button", { name: "Pausar conversación", exact: true }).click();
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "false");
});
test("switching to Chat keeps history, closes the microphone and survives reload", async ({ page }) => {
  await emailStart(page, "es", undefined, false); await startVoice(page);
  await switchToChat(page); await expect(questionField(page)).toBeVisible();
  await askText(page, "Merengue");
  await page.reload(); await expect(questionField(page)).toBeVisible();
  await expect(page.locator(".chat-message.user")).toContainText("Merengue");
  await page.locator(".return-to-voice").click();
  await expect(questionField(page)).toHaveCount(0);
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "false");
});
test("denied microphone falls back to writing", async ({ page, context }) => {
  await context.clearPermissions(); await context.grantPermissions([]);
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); }; });
  await emailStart(page, "es", undefined, false);
  await page.locator(".voice-main-mic").click(); await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  await expect(questionField(page)).toBeVisible(); await expect(page.getByRole("status").filter({ hasText: "Sigamos por escrito" })).toBeVisible();
});
test("unsupported recording offers Chat", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "MediaRecorder", { value: undefined }); });
  await emailStart(page, "es", undefined, false); await expect(questionField(page)).toBeVisible();
});
test("eight seconds without voice cancels without upload or a listening loop", async ({ page }) => {
  await page.addInitScript(() => {
    AnalyserNode.prototype.getByteTimeDomainData = samples => { samples.fill(128); };
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints); Object.assign(window, { lastTracks: stream.getTracks() }); return stream;
    };
  });
  let uploads = 0; page.on("request", request => { if (request.url().endsWith("/api/voice/ask")) uploads++; });
  await page.clock.install(); await emailStart(page, "es", undefined, false); await startVoice(page);
  await page.clock.runFor(8100);
  await expect(page.locator(".voice-main-mic")).toHaveAccessibleName("Toca para hablar");
  expect(await page.evaluate(() => (window as Window & { lastTracks?: MediaStreamTrack[] }).lastTracks?.every(track => track.readyState === "ended"))).toBe(true);
  await page.clock.runFor(16000); expect(uploads).toBe(0);
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "false");
});
test("interrupting Ary opens the microphone, and Chat releases its tracks", async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints); Object.assign(window, { lastTracks: stream.getTracks() }); return stream;
    };
  });
  await emailStart(page, "es", undefined, false); await mockSpeech(page, 6);
  await page.locator(".voice-main-mic").click(); await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  await expect(page.locator(".ary-stage")).toHaveClass(/is-speaking/);
  await page.locator(".voice-main-mic").click();
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  await switchToChat(page);
  expect(await page.evaluate(() => (window as Window & { lastTracks?: MediaStreamTrack[] }).lastTracks?.every(track => track.readyState === "ended"))).toBe(true);
});
test("two failed speech turns preserve subtitles and switch to Chat", async ({ page }) => {
  await page.route("**/api/voice/speak", route => route.fulfill({ status: 503, json: { error: "voice_unavailable" } }));
  await emailStart(page, "es", undefined, false); await mockAnswer(page);
  await page.locator(".voice-main-mic").click(); await page.getByRole("button", { name: "Acepto · Grabar" }).click();
  await expect(page.locator(".voice-main-mic")).toHaveAttribute("aria-pressed", "true", { timeout: 12000 });
  await page.waitForTimeout(400); await page.locator(".voice-main-mic").click();
  await expect(questionField(page)).toBeVisible(); await expect(page.locator(".chat-message.user")).toContainText("merengue");
});
test("kiosk defaults to English voice with no microphone acquisition before a touch", async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    Object.assign(window, { microphoneCalls: 0 });
    navigator.mediaDevices.getUserMedia = constraints => { const state = window as Window & { microphoneCalls?: number }; state.microphoneCalls = (state.microphoneCalls || 0) + 1; return original(constraints); };
    localStorage.setItem("ary_mode", "chat");
  });
  await page.goto("/kiosco"); await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".voice-main-mic")).toHaveAccessibleName("Talk to Ary");
  expect(await page.evaluate(() => (window as Window & { microphoneCalls?: number }).microphoneCalls)).toBe(0);
});
for (const pass of [1, 2]) test(`visual pass ${pass}: ES/EN idle, listening, speaking card and Chat at 390/768/1440`, async ({ page, context }) => {
  test.setTimeout(240000);
  const directory = "docs/screenshots/stage9d"; await mkdir(directory, { recursive: true });
  async function capture(name: string) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${directory}/pass-${pass}-${name}.png`, fullPage: true, animations: "disabled" });
  }
  for (const locale of ["es", "en"] as const) for (const width of [390, 768, 1440]) {
    await context.clearCookies(); await page.setViewportSize({ width, height: 900 });
    await page.goto("/experiencia"); await page.evaluate(() => localStorage.removeItem("ary_mode"));
    await emailStart(page, locale, undefined, false); await page.reload();
    await expect(page.locator(".voice-main-mic")).toBeEnabled(); await capture(`${locale}-${width}-idle`);
    await mockSpeech(page, .4); await mockAnswer(page, locale); await startVoice(page, locale === "en");
    await capture(`${locale}-${width}-listening`);
    await mockSpeech(page, 4); await page.waitForTimeout(400); await page.locator(".voice-main-mic").click();
    await expect(page.locator(".ary-stage")).toHaveClass(/is-speaking/); await expect(page.locator(".chat-card")).toBeVisible();
    await capture(`${locale}-${width}-speaking-card`);
    await switchToChat(page); await expect(questionField(page)).toBeVisible(); await capture(`${locale}-${width}-chat`);
    await page.unroute("**/api/voice/ask");
  }
});
