"use client";
import { useState } from "react";
import { dictionaries } from "../i18n";
import { api } from "./api";
import { Shell, useLocale } from "./shared";
export function Activation({ code }: { code: string }) {
  const [locale, setLocale] = useLocale(), t = dictionaries[locale];
  const [error, setError] = useState(false), [busy, setBusy] = useState(false);
  return <Shell locale={locale} setLocale={setLocale}><section className="flow-panel"><h1>{t.activate}</h1><p>{t.activateHelp}</p>{error && <p className="notice error" role="alert">{t.activationUnavailable}</p>}<button disabled={busy || !code} onClick={async () => { setBusy(true); try { await api("/api/kiosk/activate", "POST", { code }); window.location.replace("/kiosco"); } catch { setError(true); setBusy(false); } }}>{busy ? t.working : t.activate}</button></section></Shell>;
}
