import type { Locale } from "../../i18n/index.ts";
export type Template = "staff_login" | "campaign" | "recovery" | "marketing_confirmation" | "saved_places" | "cultural_reminder" | "preferences_updated" | "provider_receipt" | "commercial_receipt" | "commercial_admin";
export interface RenderedEmail { subject: string; html: string; text: string; headers: Record<string, string> }
export interface TemplateData { url?: string; unsubscribeUrl?: string; preferencesUrl?: string; reference?: string; providerName?: string; sharedFields?: string[]; campaignSubject?: string; campaignMessage?: string }
const copy: Record<Locale, Record<Template, [string, string]>> = {
  es: {
    staff_login: ["Acceso del personal · Ary", "Confirma el acceso de personal solicitado. Este enlace se usa una sola vez y caduca en 15 minutos. No da acceso a una sesión de visitante."],
    campaign: ["Novedades culturales · Ary", "Novedades solicitadas mediante suscripción confirmada. Puedes darte de baja en cualquier momento."],
    recovery: ["Continúa tu experiencia con Ary", "Has solicitado guardar o recuperar Mi viaje. Conservamos tus selecciones y guardados durante 365 días de inactividad. Confirma el acceso; este enlace caduca en 15 minutos y se usa una sola vez."],
    marketing_confirmation: ["Confirma que deseas recibir novedades", "Confirma tu suscripción opcional a novedades culturales de Ary. Hasta que confirmes no recibirás marketing. Este enlace caduca en 15 minutos y se usa una sola vez."],
    saved_places: ["Tus lugares guardados", "Este es el acceso al resumen que solicitaste. Autentícate para ver tus guardados; este correo no contiene tu perfil ni conversaciones."],
    cultural_reminder: ["Tu próxima experiencia cultural", "Recordatorio cultural opcional de Ary según tu frecuencia elegida. Puedes pausar o dar de baja estos correos en cualquier momento."],
    preferences_updated: ["Preferencias actualizadas / confirmación de baja", "Hemos actualizado las preferencias de correo que solicitaste. Una baja detiene los próximos envíos de marketing."],
    provider_receipt: ["Solicitud enviada a un proveedor", "Recibo de la solicitud que autorizaste para el proveedor y los campos indicados a continuación. No compartimos conversaciones ni tu perfil completo."],
    commercial_receipt: ["Solicitud de información recibida · Ary", "Tu solicitud comercial quedó registrada con la referencia indicada. Se usará para responder a esta solicitud; no se añade a campañas."],
    commercial_admin: ["Nueva solicitud comercial · Ary", "Hay una nueva solicitud comercial registrada. Consulta la base de datos autorizada mediante su referencia; este aviso no incluye los datos personales del solicitante."],
  },
  en: {
    staff_login: ["Staff access · Ary", "Confirm your requested staff access. This single-use link expires in 15 minutes and does not open a visitor session."],
    campaign: ["Cultural updates · Ary", "Updates requested through a confirmed subscription. You can unsubscribe at any time."],
    recovery: ["Continue your experience with Ary", "You requested to save or recover My trip. We retain your selections and saved places for 365 days of inactivity. Confirm access; this single-use link expires in 15 minutes."],
    marketing_confirmation: ["Confirm you want to receive updates", "Confirm your optional Ary cultural updates subscription. No marketing is sent before confirmation. This single-use link expires in 15 minutes."],
    saved_places: ["Your saved places", "Access the summary you requested. Sign in to see your saved places; this email contains no profile or conversations."],
    cultural_reminder: ["Your next cultural experience", "An optional Ary cultural reminder at your chosen frequency. Pause or unsubscribe at any time."],
    preferences_updated: ["Preferences updated / unsubscribe confirmation", "We updated the email preferences you requested. Unsubscribing stops future marketing emails."],
    provider_receipt: ["Request sent to a provider", "Receipt for the request you authorized for the provider and fields listed below. We do not share conversations or your full profile."],
    commercial_receipt: ["Information request received · Ary", "Your business inquiry was recorded with the reference below. It will only be used to respond to your inquiry, with no campaign enrollment."],
    commercial_admin: ["New business inquiry · Ary", "A new business inquiry was recorded. Use its reference in the authorized database; this notification contains no applicant personal data."],
  },
};
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
function safeUrl(value?: string) { if (!value) return undefined; const url = new URL(value); if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid email link"); return url.href; }
export function renderEmail(template: Template, locale: Locale, data: TemplateData = {}): RenderedEmail {
  const [defaultSubject, intro] = copy[locale][template];
  const subject = template === "campaign" ? (data.campaignSubject || defaultSubject) : defaultSubject;
  const detail = [data.reference, data.providerName, data.sharedFields?.join(", "), template === "campaign" ? data.campaignMessage : undefined].filter(Boolean).join(" · ");
  const links = [safeUrl(data.url), safeUrl(data.preferencesUrl), safeUrl(data.unsubscribeUrl)].filter((url): url is string => !!url);
  const expiry = locale === "es" ? "Los enlaces de acceso o confirmación caducan en 15 minutos. Preferencias y baja no dan acceso a Mi viaje." : "Access and confirmation links expire in 15 minutes. Preferences and unsubscribe links do not grant access to My trip.";
  const footer = locale === "es" ? "Ary · La Cotorra. Comunicación para la finalidad solicitada. Responsable y contacto: pendientes de revisión jurídica antes de producción." : "Ary · La Cotorra. Communication for the requested purpose. Controller and contact: legal review required before production.";
  const text = [subject, intro, detail, ...links, expiry, footer].filter(Boolean).join("\n\n");
  const html = `<!doctype html><html lang="${locale}"><body><main><h1>${escape(subject)}</h1><p>${escape(intro)}</p>${detail ? `<p>${escape(detail)}</p>` : ""}${links.map((url, i) => `<p><a href="${escape(url)}">${escape(i === 0 && data.url ? (locale === "es" ? "Continuar" : "Continue") : url === data.unsubscribeUrl ? (locale === "es" ? "Dar de baja con un clic" : "Unsubscribe") : (locale === "es" ? "Preferencias" : "Preferences"))}</a></p>`).join("")}<p>${escape(expiry)}</p><footer>${escape(footer)}</footer></main></body></html>`;
  return { subject, html, text, headers: data.unsubscribeUrl ? { "List-Unsubscribe": `<${safeUrl(data.unsubscribeUrl)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {} };
}
