import { expect, type Page } from "@playwright/test";

export const recoveryTitle = {
  es: "¿Ya hablaste con Ary? Recupera tu conversación.",
  en: "Already talked to Ary? Pick up where you left off.",
};

export function questionField(page: Page) {
  return page.getByRole("textbox", { name: /^(Tu pregunta cultural|Your cultural question)$/ });
}

export async function recoveryLink(page: Page, email: string) {
  await page.goto("/dev/outbox");
  const message = page.locator('article[data-template="recovery"]').filter({ hasText: email });
  await expect(message).toHaveCount(1);
  const link = await message.getByRole("link", { name: /^(Abrir enlace|Open link)$/ }).getAttribute("href");
  expect(link).toBeTruthy();
  return link!;
}

export async function requestRecovery(page: Page, email: string) {
  await page.goto("/reingresar?lang=es");
  await expect(page.getByRole("heading", { name: recoveryTitle.es, exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Tu correo", exact: true }).fill(email);
  const privacy = page.getByRole("checkbox", { name: "Acepto el aviso de privacidad", exact: true });
  await expect(privacy).not.toBeChecked();
  await expect(privacy).toHaveAttribute("required", "");
  await expect(page.getByRole("checkbox")).toHaveCount(1); // Marketing is disabled in the E2E server.
  const submit = page.getByRole("button", { name: "Enviarme el enlace", exact: true });
  await expect(submit).toBeDisabled();
  await privacy.check();
  await submit.click();
  const title = page.getByRole("heading", { name: "¡Todo listo para conversar!", exact: true });
  await expect(title).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Modo prueba: el correo no se envía todavía.");
  return recoveryLink(page, email);
}

export async function confirmRecovery(page: Page, link: string) {
  await page.goto(link);
  await page.getByRole("button", { name: /^(Confirmar|Confirm)$/ }).click();
  await expect(page).toHaveURL(/\/experiencia$/);
  await expect(page.locator(".voice-chat")).toBeVisible();
}
