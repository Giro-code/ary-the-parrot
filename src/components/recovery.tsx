"use client";
import { useState } from "react";
import { api } from "./api";
import { ErrorNotice, Shell, useLocale } from "./shared";
import type { Locale } from "../i18n";
import { noticeVersion } from "../privacy";
export function Recovery({ initialLocale, marketingEnabled, development }: { initialLocale: Locale; marketingEnabled: boolean; development: boolean }) {
  const [locale, setLocale] = useLocale(initialLocale), en = locale === "en";
  const [email, setEmail] = useState(""), [recovery, setRecovery] = useState(false), [marketing, setMarketing] = useState(false), [busy, setBusy] = useState(false), [state, setState] = useState<string | null>(null), [error, setError] = useState<unknown>(null);
  async function submit() {
    setBusy(true); setError(null); setState(null);
    try { const result = await api<{ deliveryState: string }>("/api/auth/request-link", "POST", { email, locale, consentVersion: noticeVersion, transactionalRecovery: recovery, marketingEmail: marketing }); setState(result.deliveryState); }
    catch (error) { setError(error); } finally { setBusy(false); }
  }
  return <Shell locale={locale} setLocale={setLocale}><section className="flow-panel"><p className="eyebrow">Ary · {en ? "Optional account" : "Cuenta opcional"}</p><h1>{en ? "Save and recover My trip" : "Guardar y recuperar Mi viaje"}</h1>
    <p>{en ? "Keep your selections and saved places and recover them on another device by verifying your email. Exploring Ary never requires an email." : "Conserva tus selecciones y guardados y recupéralos en otro dispositivo verificando tu correo. Puedes explorar Ary sin dar tu email."}</p>
    <p className="muted">{en ? "We retain your account and saved places for 365 days of inactivity. The access link expires in 15 minutes and works once. You receive a service email only when you request access; no recurring emails by default." : "Conservamos la cuenta y los guardados durante 365 días de inactividad. El enlace caduca en 15 minutos y funciona una sola vez. Recibirás un correo de servicio cuando solicites acceso; no hay correos periódicos por defecto."}</p>
    <form className="account-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label htmlFor="recovery-email">{en ? "Email" : "Correo electrónico"}</label><input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
      <label className="check-row"><input type="checkbox" checked={recovery} onChange={event => setRecovery(event.target.checked)} required disabled={busy} /><span>{en ? "I request storage and email recovery of My trip (required to receive the link)." : "Solicito conservar Mi viaje y recibir el enlace de recuperación por correo (necesario para recibir el enlace)."}</span></label>
      {marketingEnabled && <label className="check-row"><input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} disabled={busy} /><span>{en ? "I also want optional cultural updates, monthly by default. A separate email confirmation is required." : "También quiero novedades culturales opcionales, mensuales por defecto. Requiere una confirmación adicional por correo."}</span></label>}
      <a href="/privacidad">{en ? "Purposes and privacy notice" : "Finalidades y aviso de privacidad"} · {noticeVersion}</a>
      <div className="actions"><button disabled={busy}>{busy ? (en ? "Processing…" : "Procesando…") : (en ? "Request access link" : "Solicitar enlace de acceso")}</button><a href="/experiencia">{en ? "Continue exploring" : "Seguir explorando"}</a></div>
    </form>
    {state && <div className="notice" role="status"><p>{state === "dry_run" ? (en ? "Test mode: the email was not sent; in development you can view the link at /dev/outbox." : "Modo prueba: el correo no se envió; en desarrollo puedes ver el enlace en /dev/outbox") : (en ? "Request recorded. If eligible, your email is queued; delivery is not confirmed." : "Solicitud registrada. Si procede, el correo queda en cola; la entrega no está confirmada.")}</p>{state === "dry_run" && development && <a href="/dev/outbox">{en ? "Open test outbox" : "Abrir bandeja de prueba"}</a>}</div>}
    {error !== null && <ErrorNotice error={error} locale={locale} retry={() => void submit()} />}
  </section></Shell>;
}
