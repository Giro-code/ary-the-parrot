"use client";
import { useState } from "react";
import { dictionaries, type Locale } from "../i18n";
import { api, ApiError } from "./api";
import { Shell } from "./shared";
export function Redeem({ token, code, initialError, initialLocale }: { token: string; code?: string; initialError?: string; initialLocale: Locale }) {
  const [locale, setLocale] = useState(initialLocale), t = dictionaries[locale];
  const [error, setError] = useState(initialError), [busy, setBusy] = useState(false);
  async function redeem() {
    setBusy(true);
    try { await api("/api/visitor/handoff/redeem", "POST", { token, confirmationCode: code }); window.location.replace("/experiencia"); }
    catch (error) { setError(error instanceof ApiError ? error.code : "service_unavailable"); setBusy(false); }
  }
  const expired = error === "handoff_expired";
  const unavailable = error === "handoff_unavailable" || error === "invalid_body";
  return <Shell locale={locale} setLocale={setLocale}><section className="flow-panel">
    <p className="eyebrow">Ary · {t.handoff}</p><h1>{error ? expired ? t.expired : unavailable ? t.unavailable : t.error : t.redeemTitle}</h1>
    {error ? <><p role="alert">{expired ? t.expiredHelp : unavailable ? t.unavailableHelp : error === "rate_limited" ? t.rateError : t.serviceError}</p>{!expired && !unavailable && <button className="secondary" onClick={() => window.location.reload()}>{t.retry}</button>}</> : <><p>{t.redeemHelp}</p><p>{t.checkCode}</p><strong className="confirmation-code">{code}</strong><p>{t.qrPrivacy}</p><button disabled={busy} onClick={() => void redeem()}>{busy ? t.working : t.redeem}</button></>}
  </section></Shell>;
}
