import { expect, type Page } from "@playwright/test";
import { emailStart, switchToChat } from "./stage8-helpers";
import { questionField } from "./helpers";

export function wav(seconds = .15) {
  const pcm = Buffer.alloc(Math.round(24000 * seconds) * 2), header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(pcm.length + 36, 4); header.write("WAVEfmt ", 8); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
export async function mockSpeech(page: Page, seconds = .15) {
  await page.route("**/api/voice/speak", route => route.fulfill({ contentType: "audio/wav", body: wav(seconds) }));
}
export async function askText(page: Page, message: string, { expectComposer = true } = {}) {
  await switchToChat(page);
  const field = questionField(page);
  await expect(field).toBeVisible();
  await expect(field).toBeEnabled(); await field.fill(message);
  const response = page.waitForResponse(value => value.url().endsWith("/api/chat") && value.request().method() === "POST");
  await page.getByRole("button", { name: /^(Enviar pregunta|Send question)$/ }).click();
  const reply = await response;
  // A kiosk directions answer opens the phone QR, which intentionally pauses the composer.
  if (expectComposer) await expect(field).toBeEnabled();
  return reply;
}
export async function startChat(page: Page, mobile = false) {
  if (mobile) { await emailStart(page); }
  else {
  await page.goto(mobile ? "/experiencia" : "/kiosco");
  if (!mobile) await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click();
  await switchToChat(page);
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.locator('.kiosk-content[data-state="conversation"]')).toBeVisible();
  await switchToChat(page);
  }
  await page.locator(".chat-quick-replies").getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("button", { name: "Música", exact: true })).toBeEnabled();
}
