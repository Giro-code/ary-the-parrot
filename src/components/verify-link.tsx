"use client";
import { useState } from "react";
import { api } from "./api";
import { Shell, useLocale } from "./shared";
export function VerifyLink({ token, kind = "recovery" }: { token: string; kind?: "recovery" | "marketing" | "unsubscribe" }) {
  const [locale, setLocale] = useLocale(), en = locale === "en";
  const [busy, setBusy] = useState(false), [error, setError] = useState(false), [done, setDone] = useState(false);
  async function confirm() {
    setBusy(true); setError(false);
    try {
      const path = kind === "recovery" ? "/api/auth/verify-link" : kind === "marketing" ? "/api/email/confirm" : `/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
      await api(path, "POST", kind === "unsubscribe" ? {} : { token });
      if (kind === "recovery") window.location.replace("/mi-viaje");
      else { window.history.replaceState(null, "", window.location.pathname); setDone(true); }
    } catch { setError(true); } finally { setBusy(false); }
  }
  const title = kind === "recovery" ? (en ? "Confirm access to My trip" : "Confirmar acceso a Mi viaje") : kind === "marketing" ? (en ? "Confirm cultural updates" : "Confirmar novedades culturales") : (en ? "Unsubscribe from updates" : "Dar de baja las novedades");
  return <Shell locale={locale} setLocale={setLocale}><section className="flow-panel"><p className="eyebrow">Ary</p><h1>{title}</h1>
    {done ? <p className="notice" role="status">{kind === "unsubscribe" ? (en ? "Unsubscribed. Future marketing is stopped." : "Baja registrada. Se detienen los próximos envíos de marketing.") : (en ? "Subscription confirmed. Manage frequency and pause in Privacy." : "Suscripción confirmada. Gestiona la frecuencia y la pausa en Privacidad.")}</p> : <><p>{kind === "recovery" ? (en ? "Press confirm to use this single-use link. Opening the page does not sign you in. The link expires in 15 minutes." : "Pulsa confirmar para usar este enlace de un solo uso. Abrir la página no inicia sesión. El enlace caduca en 15 minutos.") : (en ? "This action only changes your email subscription and does not sign you in." : "Esta acción solo cambia la suscripción de correo y no inicia sesión.")}</p><button disabled={busy || !/^[\w-]{43}$/.test(token)} onClick={() => void confirm()}>{busy ? (en ? "Processing…" : "Procesando…") : (en ? "Confirm" : "Confirmar")}</button></>}
    {error && <div className="notice error" role="alert"><p>{en ? "This link is unavailable, has expired or has already been used. Request a new link to try again." : "El enlace no está disponible, caducó o ya se usó. Solicita un enlace nuevo para volver a intentarlo."}</p><a href="/reingresar">{en ? "Request a new link" : "Solicitar otro enlace"}</a></div>}
    <p><a href="/cuenta/privacidad">{en ? "Manage privacy" : "Gestionar privacidad"}</a></p>
  </section></Shell>;
}
