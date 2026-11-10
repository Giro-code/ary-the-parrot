"use client";
import { uiText } from "../i18n/ui";
import { useEffect, type ReactNode } from "react";
import { LanguageSelector } from "./locale-provider";
import type { Locale } from "../i18n";
export function VoiceShell({ locale, setLocale, kiosk = false, children }: { locale: Locale; setLocale: (value: Locale) => void; kiosk?: boolean; children: ReactNode }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <div className={`ary-app voice-app ${kiosk ? "kiosk-app" : ""}`}><a className="skip" href="#main">{uiText(locale, "skipToContent")}</a><header className="voice-header"><a className="brand" href="/#inicio">ARY <span>la Cotorra</span></a><nav aria-label={uiText(locale, "navigation")}>{kiosk ? <span>{uiText(locale, "dominicanRepublic")}</span> : <><a href="/mi-viaje">{uiText(locale, "myTrip")}</a><a href="/cuenta/privacidad">{uiText(locale, "myData")}</a></>}<LanguageSelector locale={locale} onChange={setLocale} /></nav></header><main id="main" tabIndex={-1}>{children}</main></div>;
}
