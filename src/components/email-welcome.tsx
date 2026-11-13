"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";
import { noticeVersion } from "../privacy";
import { api, ApiError } from "./api";
import type { Visitor } from "./types";
import { AccountArt, EmailSteps, EmailSuccess } from "./account-visuals";

export function EmailWelcome({ locale, dryRun, onStarted }: { locale: Locale; dryRun: boolean; onStarted: (visitor: Visitor) => void }) {
  const en = locale === "en";
  const [email, setEmail] = useState(""), [terms, setTerms] = useState(false), [marketing, setMarketing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [started, setStarted] = useState<{ session: Visitor; deliveryState: string } | null>(null);
  // Offline: keep the form and finish on its own when the connection returns.
  const [waiting, setWaiting] = useState(false), restored = useRef(false);
  useEffect(() => {
    if (restored.current) return; restored.current = true;
    const timer = setTimeout(() => { try { const draft = JSON.parse(sessionStorage.getItem("ary_welcome_draft") || "null"); if (draft) { setEmail(draft.email || ""); setTerms(!!draft.terms); setMarketing(!!draft.marketing); if (draft.waiting) setWaiting(true); } } catch { /* Storage unavailable. */ } }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { try { if (email || terms) sessionStorage.setItem("ary_welcome_draft", JSON.stringify({ email, terms, marketing, waiting })); } catch { /* Storage unavailable. */ } }, [email, terms, marketing, waiting]);
  useEffect(() => {
    if (!waiting) return;
    const retry = () => { if (navigator.onLine) void submit(); };
    const timer = setInterval(retry, 5000); window.addEventListener("online", retry);
    return () => { clearInterval(timer); window.removeEventListener("online", retry); };
    // submit reads the current form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, email, terms, marketing]);
  async function submit() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ session: Visitor; deliveryState: string }>("/api/auth/start", "POST", { email, locale, consentVersion: noticeVersion, terms, marketing });
      setWaiting(false); try { sessionStorage.removeItem("ary_welcome_draft"); } catch { /* Storage unavailable. */ }
      setStarted(result);
    } catch (error) {
      const offline = !(error instanceof ApiError) || error.code === "service_unavailable" || error.code === "database_not_configured" || !navigator.onLine;
      if (offline) { setWaiting(true); return; }
      setWaiting(false);
      setError(error instanceof ApiError && error.code === "rate_limited" ? en ? "Too many attempts. Please wait a little before trying again." : "Demasiados intentos. Espera un poco antes de volver a probar." : en ? "We couldn't start. Please check your email and try again." : "No pudimos empezar. Revisa tu correo y vuelve a intentarlo.");
    }
    finally { setBusy(false); }
  }
  if (started) return <EmailSuccess locale={locale} dryRun={started.deliveryState === "dry_run"} onContinue={() => onStarted(started.session)}/>;
  return <section className="email-welcome account-journey" aria-labelledby="welcome-title">
    <AccountArt locale={locale} envelope mood={error || waiting ? "sin-conexion" : "presentar"} bubble={en ? "A little hello, a new adventure." : "Un saludo, una nueva aventura."}/>
    <div className="account-content"><h1 id="welcome-title">{en ? "Hello! Let's keep in touch." : "¡Hola! Sigamos conversando."}</h1>
    <p>{en ? "Share your email to return to your conversations and My culture." : "Déjame tu correo para volver a tus conversaciones y a Mi cultura."}</p><EmailSteps locale={locale}/>
    <form className="account-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div><label htmlFor="welcome-email">{en ? "Your email" : "Tu correo"}</label><input id="welcome-email" type="email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={event => setEmail(event.target.value)}/></div>
      <label className="check-row"><input type="checkbox" required checked={terms} disabled={busy} onChange={event => setTerms(event.target.checked)}/><span>{en ? "I accept the " : "Acepto los "}<a href={`/terminos?lang=${locale}`} target="_blank" rel="noreferrer">{en ? "Terms and Conditions" : "Términos y Condiciones"}</a>{en ? " and the " : " y la "}<a href={`/privacidad?lang=${locale}`} target="_blank" rel="noreferrer">{en ? "Privacy Policy" : "Política de Privacidad"}</a>.</span></label>
      <label className="check-row"><input type="checkbox" checked={marketing} disabled={busy} onChange={event => setMarketing(event.target.checked)}/><span>{en ? "Email me news and promotions (optional)." : "Quiero novedades y promociones por correo (opcional)."}</span></label>
      {dryRun && <p className="notice test-mode" role="status">{en ? "Test mode: emails are not sent yet." : "Modo prueba: el correo de verificación no se envía todavía."}</p>}
      <button disabled={busy || !terms}>{waiting ? en ? "Waiting for connection…" : "Esperando conexión…" : busy ? en ? "Starting…" : "Empezando…" : en ? "Start talking to Ary" : "Empezar a hablar con Ary"}</button>
      {waiting && <p role="status" className="notice waiting-connection">{en ? "No connection right now. I kept your details and will continue on my own as soon as the internet is back." : "Ahora mismo no hay conexión. Guardé tus datos y seguiré solo en cuanto vuelva internet."}</p>}
      {error && <p role="alert" className="notice error">{error}</p>}
    </form></div>
  </section>;
}
