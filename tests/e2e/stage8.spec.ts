import { test, expect, devices, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { emailStart, verifyEmail } from "./stage8-helpers";
import { askText, mockSpeech } from "./voice-helpers";
import { questionField } from "./helpers";
const root = "docs/screenshots/stage8", origin = "http://127.0.0.1:3002";
test.beforeEach(async ({ page, context }) => { await context.setExtraHTTPHeaders({ "x-forwarded-for": `stage8-${randomUUID()}` }); await mockSpeech(page); });
async function stable(page: Page) { await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {}))); }); }
async function capture(page: Page, name: string) { await mkdir(root, { recursive: true }); await stable(page); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `${root}/${name}.png`, fullPage: true, animations: "disabled" }); }
test("ES/EN email welcome requires terms, marketing is unchecked, dry-run honest, and quota is enforced", async ({ page }) => {
  for (const locale of ["es", "en"]) {
    await page.goto(`/experiencia?lang=${locale}`);
    await expect(page.locator('#welcome-email')).toBeVisible();
    const checks = page.locator('input[type="checkbox"]'); await expect(checks).toHaveCount(2);
    await expect(checks.nth(0)).not.toBeChecked(); await expect(checks.nth(0)).toHaveAttribute('required',''); await expect(checks.nth(1)).not.toBeChecked();
    await expect(page.locator('.account-form button')).toBeDisabled(); await expect(page.locator('.test-mode')).toContainText(locale === 'es' ? 'no se envía todavía' : 'not sent yet');
    await expect(page.locator('.welcome-envelope')).toHaveAttribute('role','img');
  }
  await emailStart(page); await page.locator('.chat-quick-replies').getByRole('button',{name:'Español',exact:true}).click();
  const send = page.getByRole('button', { name: 'Enviar pregunta', exact: true });
  await expect(send).toBeDisabled();
  for (let i = 0; i < 5; i++) {
    const response = await askText(page, 'Cuéntame del merengue');
    expect(response.status()).toBe(200);
    await expect(questionField(page)).toHaveValue('');
    await expect(send).toBeDisabled();
  }
  const limited = await askText(page, 'Una pregunta más');
  expect(limited.status()).toBe(403);
  expect(await limited.json()).toMatchObject({ error: 'email_verification_required' });
  await expect(page.getByRole('alert').filter({ hasText: '5 preguntas' })).toBeVisible();
  await page.reload(); await expect(page.locator('#welcome-email')).toHaveCount(0); await expect(page.locator('.chat-message.user')).toHaveCount(5); // only server-persisted questions survive reload
  expect((await page.request.get('/api/chat')).status()).toBe(200);
});
test("web directions offers saving and never creates a private QR; general label is distinct", async ({ page }) => {
  await emailStart(page); await askText(page,'¿Cómo llego a Altos de Chavón?');
  await expect(page.getByRole('button',{name:'Guardar en Mi cultura',exact:true}).first()).toBeVisible();
  await expect(page.locator('.inline-handoff')).toHaveCount(0); await expect(page.locator('[data-ary-image="handoff_qr"]')).toHaveCount(0);
  await page.route('**/api/chat', route => route.request().method()==='POST' ? route.fulfill({json:{messageId:randomUUID(),detectedLanguage:'es',displayText:'¡Qué gusto! Podemos descubrir la isla a tu ritmo.',spokenText:'¡Qué gusto! Podemos descubrir la isla a tu ritmo.',intent:'general',citedItemIds:[],followUps:[],confidence:.8,mode:'gemini',handoff:false,sources:[]}}) : route.continue());
  await askText(page,'Hola, ¿cómo estás?'); await expect(page.locator('.reply-mode').last()).toHaveText('Respuesta general de IA');
});
test("verified conversations list, open, continue and delete; access skips welcome", async ({ page }) => {
  const email=await emailStart(page); await askText(page,'Cuéntame del merengue'); await verifyEmail(page,email);
  await expect(page.locator('#welcome-email')).toHaveCount(0); await expect(page.locator('.chat-message.user').last()).toContainText('merengue');
  await page.goto('/mis-conversaciones'); await page.getByRole('button',{name:/Cuéntame del merengue/}).click();
  await expect(page.locator('.conversation-detail')).toContainText('merengue'); await page.getByRole('button',{name:'Continuar esta conversación',exact:true}).click();
  await expect(page).toHaveURL(/\/experiencia$/); await askText(page,'Bachata');
  await page.goto('/mis-conversaciones'); await page.getByRole('button',{name:/Cuéntame del merengue/}).click(); await expect(page.locator('.conversation-detail')).toContainText('Bachata');
  await page.getByRole('button',{name:'Borrar conversación',exact:true}).click(); await expect(page.getByText('Aún no tienes conversaciones guardadas.')).toBeVisible();
});
test("compact chat has one main scroller, fully visible bubbles and input at all widths", async ({ page }) => {
  await emailStart(page); await askText(page,'Cuéntame del merengue');
  for (const width of [360,390,430,768,1280,1440,1920]) {
    await page.setViewportSize({width,height:900}); await page.reload(); await expect(page.locator('.chat-message.user')).toBeVisible();
    const metrics=await page.evaluate(()=>{ const chat=document.querySelector('.conversation-scroll')!.getBoundingClientRect(), composer=document.querySelector('.voice-composer')!.getBoundingClientRect(), avatar=document.querySelector('.ary-portrait')!.getBoundingClientRect(); return {width:document.documentElement.scrollWidth,viewport:innerWidth,mainHeight:chat.height,inputBottom:composer.bottom,height:innerHeight,avatar:avatar.width,clipped:[...document.querySelectorAll('.bubble')].some(b=>{const r=b.getBoundingClientRect();return r.left<0||r.right>innerWidth;})}; });
    expect(metrics.width).toBeLessThanOrEqual(width); expect(metrics.mainHeight).toBeGreaterThan(300); expect(metrics.inputBottom).toBeLessThanOrEqual(metrics.height+1); expect(metrics.avatar).toBeLessThanOrEqual(width<600?72:96); expect(metrics.clipped).toBe(false);
  }
});
test("iPhone WebKit and Android Chromium layout contracts", async ({ browser, browserName }) => {
  const device = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const context=await browser.newContext({...device, locale:'es-ES',baseURL:origin,extraHTTPHeaders:{'x-forwarded-for':`mobile-${randomUUID()}`}});
  try {const page=await context.newPage(); await mockSpeech(page); await emailStart(page); await askText(page,'Merengue'); await capture(page,`${browserName}-mobile-chat`); await expect(page.getByRole('button',{name:'Hablar con Ary',exact:true})).toBeVisible(); } finally {await context.close();}
});
for (const pass of [1,2]) test(`visual pass ${pass}: landing, email, chat, trips, conversations and kiosk QR`, async ({ page }) => {
  test.setTimeout(180000);
  for (const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    for (const locale of ['es','en']) {
      await page.goto(`/?lang=${locale}`); await page.reload(); await expect(page.locator('.talk-to-ary')).toHaveAttribute('href','/experiencia');
      await expect(page.locator('body')).not.toContainText(/kiosco|kiosk/i); await capture(page,`pass${pass}-landing-${locale}-${width}`);
      await page.locator('.cultural-places').scrollIntoViewIfNeeded(); await expect(page.locator('.cultural-places')).toContainText('Wikimedia Commons');
    }
    await page.context().clearCookies(); await page.goto('/experiencia?lang=es'); await page.reload(); await expect(page.locator('#welcome-email')).toBeVisible(); await capture(page,`pass${pass}-email-es-${width}`);
    await page.getByRole('button',{name:'English',exact:true}).click(); await capture(page,`pass${pass}-email-en-${width}`);
    const email=await emailStart(page); await askText(page,'Cuéntame del merengue'); await verifyEmail(page,email); await page.reload(); await expect(page.locator('.chat-card')).toBeVisible(); await capture(page,`pass${pass}-chat-${width}`);
    await page.getByRole('button',{name:'Guardar en Mi cultura',exact:true}).first().click(); await page.goto('/mi-cultura'); await expect(page.locator('.cultural-card')).toBeVisible(); await capture(page,`pass${pass}-trips-${width}`);
    await page.goto('/mis-conversaciones'); await expect(page.locator('.conversation-row')).toBeVisible(); await capture(page,`pass${pass}-conversations-${width}`);
    await page.locator('.conversation-row').click(); await capture(page,`pass${pass}-conversation-open-${width}`);
    await page.context().clearCookies();
    const fixture=JSON.parse(await readFile('.cache/stage2-fixture.json','utf8'));
    const response=await page.request.post('/api/kiosk/activate',{headers:{Origin:origin,'X-Ary-Request':'1'},data:{code:fixture.activationCodes[8+(pass-1)*2+(width===1440?1:0)]}}); expect(response.status()).toBe(200);
    await page.goto('/kiosco'); await page.locator('.voice-header').getByRole('button',{name:'Español',exact:true}).click(); await page.getByRole('button',{name:'Escribir',exact:true}).click(); await page.getByRole('button',{name:'Iniciar',exact:true}).click();
    await expect(page.locator('.kiosk-content[data-state="conversation"]')).toBeVisible();
    await askText(page,'¿Cómo llego a Altos de Chavón?',{ expectComposer: false }); await expect(page.locator('.inline-handoff')).toBeVisible(); await expect(page.locator('.confirmation-code')).toHaveText(/^\d{2}$/); await expect(page.locator('[data-ary-image="mostrar"]')).toBeVisible(); await capture(page,`pass${pass}-kiosk-qr-${width}`);
    await page.getByRole('button',{name:'Terminar sin continuar',exact:true}).click();
  }
});
