import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { confirmRecovery, recoveryLink } from "./helpers";
export async function switchToChat(page: Page) {
  const button = page.getByRole("button", { name: /^(Escribir|Type instead)$/ });
  if (await button.isVisible()) await button.click();
}
export async function emailStart(page: Page, locale: "es" | "en" = "es", email = `stage8-${randomUUID()}@example.invalid`, chat = true) {
  await page.goto(`/experiencia?lang=${locale}`);
  await page.locator('#welcome-email').fill(email);
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: locale === 'es' ? 'Empezar a hablar con Ary' : 'Start talking to Ary', exact:true }).click();
  await expect(page.locator('.voice-chat')).toBeVisible();
  if (chat) await switchToChat(page);
  return email;
}
export async function verifyEmail(page: Page, email: string) {
  await confirmRecovery(page, await recoveryLink(page, email));
}
