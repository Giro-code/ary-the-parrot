import { expect, type Page } from "@playwright/test";

export function wav(seconds = .15) {
  const pcm = Buffer.alloc(Math.round(24000 * seconds) * 2), header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(pcm.length + 36, 4); header.write("WAVEfmt ", 8); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
export async function mockSpeech(page: Page, seconds = .15) {
  await page.route("**/api/voice/speak", route => route.fulfill({ contentType: "audio/wav", body: wav(seconds) }));
}
export async function askText(page: Page, message: string) {
  const field = page.getByLabel("Tu pregunta cultural", { exact: true });
  if (!(await field.isVisible())) await page.getByRole("button", { name: "Usar teclado", exact: true }).first().click();
  await expect(field).toBeEnabled(); await field.fill(message);
  const response = page.waitForResponse(value => value.url().endsWith("/api/chat") && value.request().method() === "POST");
  await page.getByRole("button", { name: "Enviar pregunta", exact: true }).click();
  await response;
}
export async function startChat(page: Page, mobile = false) {
  await page.goto(mobile ? "/experiencia" : "/kiosco");
  if (!mobile) await page.locator(".voice-header").getByRole("button", { name: "Español", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.locator(".chat-quick-replies").getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("button", { name: "Música", exact: true })).toBeEnabled();
}
