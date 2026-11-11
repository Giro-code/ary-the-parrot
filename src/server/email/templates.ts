import type { Locale } from "../../i18n/index.ts";
export type Template = "staff_login" | "campaign" | "recovery" | "marketing_confirmation" | "saved_places" | "cultural_reminder" | "preferences_updated" | "provider_receipt" | "commercial_receipt" | "commercial_admin";
export interface RenderedEmail { subject: string; html: string; text: string; headers: Record<string, string> }
export interface TemplateData { url?: string; unsubscribeUrl?: string; preferencesUrl?: string; reference?: string; providerName?: string; sharedFields?: string[]; campaignSubject?: string; campaignMessage?: string }

type Mood = "presentar" | "celebrar" | "mostrar";
interface Copy { subject: string; preheader: string; title: string; body: string; cta?: string; mood: Mood; expires?: boolean }

// Short, warm copy. Retention and legal details live in the privacy notice, not in the email.
const copy: Record<Locale, Record<Template, Copy>> = {
  es: {
    recovery: { subject: "Tu enlace para seguir hablando con Ary", preheader: "Toca el botón y retomamos la conversación donde la dejamos.", title: "¡Hola de nuevo!", body: "Aquí tienes tu enlace para volver a tus conversaciones y a Mi cultura. Toca el botón y seguimos donde lo dejamos.", cta: "Seguir con Ary", mood: "presentar", expires: true },
    marketing_confirmation: { subject: "¿Confirmas que quieres novedades de Ary?", preheader: "Un toque y te contamos lo mejor de República Dominicana.", title: "¿Seguimos en contacto?", body: "Confirma que quieres recibir de vez en cuando novedades culturales de República Dominicana. Si no confirmas, no te enviaremos nada.", cta: "Sí, quiero novedades", mood: "celebrar", expires: true },
    staff_login: { subject: "Acceso del personal · Ary", preheader: "Tu enlace de acceso al panel de Ary.", title: "Acceso del personal", body: "Usa este enlace para entrar al panel de Ary. Si no lo pediste, ignora este correo.", cta: "Entrar al panel", mood: "presentar", expires: true },
    saved_places: { subject: "Tus lugares guardados con Ary", preheader: "Los rincones de República Dominicana que guardaste.", title: "Tus lugares te esperan", body: "Entra para ver los lugares que guardaste en Mi cultura.", cta: "Ver Mi cultura", mood: "mostrar", expires: true },
    cultural_reminder: { subject: "Un pedacito de República Dominicana para ti", preheader: "Ary tiene algo nuevo que contarte.", title: "¿Descubrimos algo nuevo?", body: "Ary tiene una nueva historia, sabor o lugar para ti. Cuando quieras, seguimos conversando.", cta: "Hablar con Ary", mood: "mostrar" },
    campaign: { subject: "Novedades de Ary", preheader: "Lo nuevo de Ary y República Dominicana.", title: "Novedades de Ary", body: "Te contamos lo último de Ary y de República Dominicana.", cta: "Hablar con Ary", mood: "mostrar" },
    preferences_updated: { subject: "Listo: actualizamos tus preferencias", preheader: "Tus preferencias de correo ya están guardadas.", title: "¡Listo!", body: "Guardamos tus preferencias de correo. Puedes cambiarlas cuando quieras.", mood: "celebrar" },
    provider_receipt: { subject: "Enviamos tu solicitud", preheader: "Este es el recibo de la solicitud que autorizaste.", title: "Solicitud enviada", body: "Enviamos tu solicitud solo con los datos que autorizaste. Nunca compartimos tus conversaciones.", mood: "celebrar" },
    commercial_receipt: { subject: "Recibimos tu solicitud · Ary", preheader: "Gracias por tu interés en Ary.", title: "¡Gracias por escribirnos!", body: "Recibimos tu solicitud y te responderemos pronto. Guarda esta referencia por si la necesitas.", mood: "celebrar" },
    commercial_admin: { subject: "Nueva solicitud comercial · Ary", preheader: "Hay una nueva solicitud comercial.", title: "Nueva solicitud comercial", body: "Hay una nueva solicitud comercial registrada. Búscala en el panel con esta referencia.", mood: "presentar" },
  },
  en: {
    recovery: { subject: "Your link to keep talking with Ary", preheader: "Tap the button and we'll pick up where we left off.", title: "Hello again!", body: "Here's your link back to your conversations and My culture. Tap the button and we'll pick up where we left off.", cta: "Continue with Ary", mood: "presentar", expires: true },
    marketing_confirmation: { subject: "Confirm you want news from Ary?", preheader: "One tap and we'll share the best of the Dominican Republic.", title: "Shall we stay in touch?", body: "Confirm you'd like occasional cultural news from the Dominican Republic. If you don't confirm, we won't send anything.", cta: "Yes, send me news", mood: "celebrar", expires: true },
    staff_login: { subject: "Staff access · Ary", preheader: "Your sign-in link for the Ary panel.", title: "Staff access", body: "Use this link to open the Ary panel. If you didn't request it, ignore this email.", cta: "Open the panel", mood: "presentar", expires: true },
    saved_places: { subject: "Your places saved with Ary", preheader: "The corners of the Dominican Republic you saved.", title: "Your places are waiting", body: "Sign in to see the places you saved in My culture.", cta: "See My culture", mood: "mostrar", expires: true },
    cultural_reminder: { subject: "A little piece of the Dominican Republic for you", preheader: "Ary has something new to share.", title: "Shall we discover something new?", body: "Ary has a new story, flavour or place for you. Whenever you like, let's keep talking.", cta: "Talk to Ary", mood: "mostrar" },
    campaign: { subject: "News from Ary", preheader: "What's new with Ary and the Dominican Republic.", title: "News from Ary", body: "The latest from Ary and the Dominican Republic.", cta: "Talk to Ary", mood: "mostrar" },
    preferences_updated: { subject: "Done: your preferences are updated", preheader: "Your email preferences are saved.", title: "All set!", body: "We saved your email preferences. You can change them any time.", mood: "celebrar" },
    provider_receipt: { subject: "We sent your request", preheader: "Your receipt for the request you authorized.", title: "Request sent", body: "We sent your request with only the details you authorized. We never share your conversations.", mood: "celebrar" },
    commercial_receipt: { subject: "We received your request · Ary", preheader: "Thanks for your interest in Ary.", title: "Thanks for reaching out!", body: "We received your request and will reply soon. Keep this reference in case you need it.", mood: "celebrar" },
    commercial_admin: { subject: "New business inquiry · Ary", preheader: "There's a new business inquiry.", title: "New business inquiry", body: "A new business inquiry was recorded. Look it up in the panel with this reference.", mood: "presentar" },
  },
};

const C = { paper: "#f6f3ec", card: "#fffdf8", ink: "#183e32", green: "#254e3b", lime: "#d7ee93", muted: "#5b6b5d", line: "#e3e6da", coral: "#e6a18a" };
const font = "'Helvetica Neue', Helvetica, Arial, sans-serif", serif = "Georgia, 'Times New Roman', serif";
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
function safeUrl(value?: string) { if (!value) return undefined; const url = new URL(value); if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid email link"); return url.href; }
function siteOrigin(data: TemplateData) {
  for (const value of [data.url, data.preferencesUrl, data.unsubscribeUrl]) { const url = safeUrl(value); if (url) return new URL(url).origin; }
  try { return new URL(process.env.APP_BASE_URL || "https://arytheparrot.app").origin; } catch { return "https://arytheparrot.app"; }
}

export function renderEmail(template: Template, locale: Locale, data: TemplateData = {}): RenderedEmail {
  const t = copy[locale][template], es = locale === "es";
  const subject = template === "campaign" ? (data.campaignSubject || t.subject) : t.subject;
  const origin = siteOrigin(data), url = safeUrl(data.url), preferences = safeUrl(data.preferencesUrl), unsubscribe = safeUrl(data.unsubscribeUrl);
  const details: [string, string][] = [];
  if (data.reference) details.push([es ? "Referencia" : "Reference", data.reference]);
  if (data.providerName) details.push([es ? "Proveedor" : "Provider", data.providerName]);
  if (data.sharedFields?.length) details.push([es ? "Datos compartidos" : "Shared details", data.sharedFields.join(", ")]);
  const campaignMessage = template === "campaign" ? data.campaignMessage : undefined;
  const expiry = t.expires && url ? (es ? "Por tu seguridad, el enlace funciona una sola vez y caduca en 15 minutos." : "For your security, the link works once and expires in 15 minutes.") : "";
  const why = es ? "Recibes este correo porque lo solicitaste en arytheparrot.app." : "You're receiving this email because you requested it at arytheparrot.app.";
  const notYou = t.expires ? (es ? "¿No fuiste tú? Ignora este correo; no pasará nada." : "Wasn't you? Just ignore this email; nothing will happen.") : "";

  const text = [
    t.title, t.body, campaignMessage,
    ...details.map(([label, value]) => `${label}: ${value}`),
    url ? `${t.cta || (es ? "Abrir" : "Open")}: ${url}` : "",
    expiry, notYou,
    preferences ? `${es ? "Preferencias" : "Preferences"}: ${preferences}` : "",
    unsubscribe ? `${es ? "Darte de baja" : "Unsubscribe"}: ${unsubscribe}` : "",
    "—", `Ary · ${es ? "La Cotorra · República Dominicana" : "The Parrot · Dominican Republic"}`, why, origin,
  ].filter(Boolean).join("\n\n");

  const button = url && t.cta ? `
          <tr><td align="center" style="padding:8px 32px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" bgcolor="${C.green}" style="border-radius:999px;">
                <a href="${escape(url)}" target="_blank" style="display:inline-block;padding:16px 36px;font-family:${font};font-size:17px;font-weight:bold;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:999px;">${escape(t.cta)} &rarr;</a>
              </td></tr></table>
          </td></tr>
          <tr><td class="pad" style="padding:20px 32px 0;">
            <p style="margin:0 0 8px;font-family:${font};font-size:13px;color:${C.muted};">${es ? "¿El botón no funciona? Copia y pega este enlace en tu navegador:" : "Button not working? Copy and paste this link into your browser:"}</p>
            <p style="margin:0;padding:12px 14px;background:${C.paper};border:1px dashed ${C.line};border-radius:10px;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.5;color:${C.ink};word-break:break-all;"><a href="${escape(url)}" target="_blank" style="color:${C.ink};text-decoration:none;">${escape(url)}</a></p>
          </td></tr>` : "";
  const detailRows = details.length ? `
          <tr><td class="pad" style="padding:4px 32px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};border-radius:12px;">
              ${details.map(([label, value]) => `<tr><td style="padding:10px 16px;font-family:${font};font-size:13px;color:${C.muted};width:40%;">${escape(label)}</td><td style="padding:10px 16px;font-family:${font};font-size:15px;font-weight:bold;color:${C.ink};">${escape(value)}</td></tr>`).join("")}
            </table>
          </td></tr>` : "";
  const footerLinks = [preferences ? `<a href="${escape(preferences)}" style="color:${C.muted};">${es ? "Preferencias de correo" : "Email preferences"}</a>` : "", unsubscribe ? `<a href="${escape(unsubscribe)}" style="color:${C.muted};">${es ? "Darme de baja" : "Unsubscribe"}</a>` : "", `<a href="${escape(origin)}/privacidad" style="color:${C.muted};">${es ? "Privacidad" : "Privacy"}</a>`].filter(Boolean).join(" &nbsp;·&nbsp; ");

  const html = `<!doctype html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
  <title>${escape(subject)}</title>
  <style>@media (max-width:520px){.card{border-radius:0!important}.pad{padding-left:20px!important;padding-right:20px!important}h1{font-size:26px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escape(t.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background:${C.paper};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding:0 0 16px;font-family:${font};font-size:22px;font-weight:800;letter-spacing:2px;color:${C.ink};">ARY <span style="font-family:${serif};font-style:italic;font-weight:normal;font-size:16px;letter-spacing:0;">${es ? "la Cotorra" : "the Parrot"}</span></td></tr>
      </table>
      <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden;">
        <tr><td height="6" bgcolor="${C.lime}" style="height:6px;line-height:6px;font-size:0;background:${C.lime};">&nbsp;</td></tr>
        <tr><td align="center" bgcolor="#eef1e2" style="padding:28px 24px 8px;background:#eef1e2;">
          <img src="${escape(origin)}/assets/email/ary-${t.mood}.png" width="150" alt="${es ? "Ary, la cotorra dominicana" : "Ary, the Dominican parrot"}" style="display:block;width:150px;max-width:150px;height:auto;border:0;">
        </td></tr>
        <tr><td class="pad" style="padding:28px 32px 4px;">
          <h1 style="margin:0 0 12px;font-family:${serif};font-size:30px;font-weight:normal;line-height:1.2;color:${C.ink};">${escape(t.title)}</h1>
          <p style="margin:0 0 20px;font-family:${font};font-size:16px;line-height:1.6;color:#2c3a31;">${escape(t.body)}</p>
          ${campaignMessage ? `<p style="margin:0 0 20px;font-family:${font};font-size:16px;line-height:1.6;color:#2c3a31;">${escape(campaignMessage)}</p>` : ""}
        </td></tr>${detailRows}${button}
        ${expiry || notYou ? `<tr><td class="pad" style="padding:20px 32px 0;"><p style="margin:0;font-family:${font};font-size:13px;line-height:1.5;color:${C.muted};">🔒 ${escape([expiry, notYou].filter(Boolean).join(" "))}</p></td></tr>` : ""}
        <tr><td class="pad" style="padding:28px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
        <tr><td class="pad" style="padding:16px 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" style="padding-right:12px;"><img src="${escape(origin)}/assets/email/ary-celebrar.png" width="48" alt="" style="display:block;width:48px;height:auto;border:0;"></td>
            <td valign="middle" style="font-family:${font};font-size:14px;line-height:1.5;color:${C.ink};">${es ? "Con cariño," : "Warmly,"}<br><strong>Ary</strong> <span style="color:${C.muted};">· ${es ? "tu cotorra guía de República Dominicana" : "your Dominican parrot guide"}</span></td>
          </tr></table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding:20px 16px 0;font-family:${font};font-size:12px;line-height:1.6;color:${C.muted};">
          ${escape(why)}<br>${footerLinks}<br><a href="${escape(origin)}" style="color:${C.muted};">arytheparrot.app</a> · ${es ? "República Dominicana" : "Dominican Republic"}<br><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0;"><tr><td valign="middle" style="padding-right:8px;"><img src="${escape(origin)}/assets/brand/mecanicos-express-192.png" width="32" height="32" alt="Mecánicos Express" style="display:block;width:32px;height:32px;border:0;border-radius:50%;"></td><td valign="middle" style="font-family:${font};font-size:12px;color:${C.muted};">${es ? "Hecha por" : "Made by"} <strong style="color:${C.ink};">Mecánicos Express</strong></td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html, text, headers: unsubscribe ? { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {} };
}
