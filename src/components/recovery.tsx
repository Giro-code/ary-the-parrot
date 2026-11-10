"use client";
import { uiText } from "../i18n/ui";
import { useState } from "react";
import { api } from "./api";
import { ErrorNotice, Shell, useLocale } from "./shared";
import type { Locale } from "../i18n";
import { noticeVersion } from "../privacy";
export function Recovery({ initialLocale, marketingEnabled, development }: { initialLocale: Locale; marketingEnabled: boolean; development: boolean }) {
  const [locale, setLocale] = useLocale(initialLocale);
  const [email, setEmail] = useState(""), [recovery, setRecovery] = useState(false), [marketing, setMarketing] = useState(false), [busy, setBusy] = useState(false), [state, setState] = useState<string | null>(null), [error, setError] = useState<unknown>(null);
  async function submit() {
    setBusy(true); setError(null); setState(null);
    try { const result = await api<{ deliveryState: string }>("/api/auth/request-link", "POST", { email, locale, consentVersion: noticeVersion, transactionalRecovery: recovery, marketingEmail: marketing }); setState(result.deliveryState); }
    catch (error) { setError(error); } finally { setBusy(false); }
  }
  return <Shell locale={locale} setLocale={setLocale}><section className="flow-panel"><p className="eyebrow">Ary · {uiText(locale, "optionalAccount")}</p><h1>{uiText(locale, "saveAndRecoverMyTrip")}</h1>
    <p>{uiText(locale, "keepYourSelectionsAndSavedPlacesAnd")}</p>
    <p className="muted">{uiText(locale, "weRetainYourAccountAndSavedPlaces")}</p>
    <form className="account-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label htmlFor="recovery-email">{uiText(locale, "email")}</label><input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
      <label className="check-row"><input type="checkbox" checked={recovery} onChange={event => setRecovery(event.target.checked)} required disabled={busy} /><span>{uiText(locale, "iRequestStorageAndEmailRecoveryOf")}</span></label>
      {marketingEnabled && <label className="check-row"><input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} disabled={busy} /><span>{uiText(locale, "iAlsoWantOptionalCulturalUpdatesMonthly")}</span></label>}
      <a href="/privacidad">{uiText(locale, "purposesAndPrivacyNotice")} · {noticeVersion}</a>
      <div className="actions"><button disabled={busy}>{busy ? (uiText(locale, "processing")) : (uiText(locale, "requestAccessLink"))}</button><a href="/experiencia">{uiText(locale, "continueExploring")}</a></div>
    </form>
    {state && <div className="notice" role="status"><p>{state === "dry_run" ? (uiText(locale, "testModeTheEmailWasNotSent")) : (uiText(locale, "requestRecordedIfEligibleYourEmailIs"))}</p>{state === "dry_run" && development && <a href="/dev/outbox">{uiText(locale, "openTestOutbox")}</a>}</div>}
    {error !== null && <ErrorNotice error={error} locale={locale} retry={() => void submit()} />}
  </section></Shell>;
}
