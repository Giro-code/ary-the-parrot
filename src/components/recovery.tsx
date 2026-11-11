"use client";
import { useState } from "react";
import { api, ApiError } from "./api";
import { Shell, useLocale } from "./shared";
import type { Locale } from "../i18n";
import { noticeVersion } from "../privacy";
import { AccountArt, EmailSteps, EmailSuccess } from "./account-visuals";
import { Icon } from "./icons";
export function Recovery({ initialLocale, marketingEnabled }: { initialLocale: Locale; marketingEnabled: boolean }) {
  const [locale, setLocale] = useLocale(initialLocale), en = locale === "en";
  const [email, setEmail] = useState(""), [recovery, setRecovery] = useState(false), [marketing, setMarketing] = useState(false), [busy, setBusy] = useState(false), [state, setState] = useState<string | null>(null), [error, setError] = useState("");
  async function submit() {
    setBusy(true); setError("");
    try { const result = await api<{ deliveryState: string }>("/api/auth/request-link", "POST", { email, locale, consentVersion: noticeVersion, transactionalRecovery: recovery, marketingEmail: marketing }); setState(result.deliveryState); }
    catch (error) { setError(error instanceof ApiError && error.code === "rate_limited" ? en ? "Please wait a few minutes before requesting another link." : "Espera unos minutos antes de pedir otro enlace." : error instanceof ApiError && error.code === "notice_version_changed" ? en ? "The privacy notice changed. Reload and review it before continuing." : "El aviso de privacidad cambió. Recarga y revísalo para continuar." : en ? "We couldn't connect. Check your connection and try again." : "No pudimos conectar. Revisa tu conexión y vuelve a intentarlo."); } finally { setBusy(false); }
  }
  return <Shell locale={locale} setLocale={setLocale}>{state ? <EmailSuccess locale={locale} dryRun={state === "dry_run"} onContinue={() => window.location.replace("/experiencia")}/> : <section className="account-journey" aria-labelledby="recovery-title">
    <AccountArt locale={locale} envelope mood={error ? "sin-conexion" : "presentar"} bubble={en ? "Let's pick up our conversation!" : "¡Sigamos donde lo dejamos!"}/>
    <div className="account-content"><h1 id="recovery-title">{en ? "Already talked to Ary? Pick up where you left off." : "¿Ya hablaste con Ary? Recupera tu conversación."}</h1>
      <p>{en ? "We'll email you a link to return to your conversations and My culture." : "Te enviamos un enlace a tu correo para volver a tus conversaciones y a Mi cultura."}</p><EmailSteps locale={locale}/>
      <form className="account-form" onSubmit={event => { event.preventDefault(); void submit(); }} aria-busy={busy}>
        <div><label htmlFor="recovery-email">{en ? "Your email" : "Tu correo"}</label><input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} aria-describedby={error ? "recovery-error" : undefined}/></div>
        <label className="check-row"><input type="checkbox" checked={recovery} onChange={event => setRecovery(event.target.checked)} required disabled={busy}/><span>{en ? "I accept the " : "Acepto el "}<a href={`/privacidad?lang=${locale}`} target="_blank" rel="noreferrer">{en ? "privacy notice" : "aviso de privacidad"}</a></span></label>
        {marketingEnabled && <label className="check-row"><input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} disabled={busy}/><span>{en ? "Email me Ary news (optional)" : "Quiero novedades de Ary por correo (opcional)"}</span></label>}
        <button disabled={busy || !recovery}>{busy ? en ? "Sending…" : "Enviando…" : en ? "Email me the link" : "Enviarme el enlace"}<Icon kind="mail"/></button>
        <a className="button secondary" href="/experiencia"><Icon kind="conversations"/>{en ? "Go to chat with Ary" : "Ir al chat con Ary"}</a>
        {error && <p id="recovery-error" className="notice error" role="alert">{error}</p>}
      </form>
    </div>
  </section>}</Shell>;
}
