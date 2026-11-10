"use client";
import { useEffect, type ReactNode } from "react";
import type { Locale } from "../i18n";
export function VoiceShell({ locale, kiosk = false, children }: { locale: Locale; kiosk?: boolean; children: ReactNode }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <div className={`ary-app voice-app ${kiosk ? "kiosk-app" : ""}`}><a className="skip" href="#main">{locale === "es" ? "Ir al contenido" : "Skip to content"}</a><header className="voice-header"><a className="brand" href="/#inicio">ARY <span>la Cotorra</span></a><nav aria-label={locale === "es" ? "Navegación" : "Navigation"}>{kiosk ? <span>{locale === "es" ? "República Dominicana" : "Dominican Republic"}</span> : <><a href="/mi-viaje">{locale === "es" ? "Mi viaje" : "My trip"}</a><a href="/cuenta/privacidad">{locale === "es" ? "Mis datos" : "My data"}</a></>}</nav></header><main id="main" tabIndex={-1}>{children}</main></div>;
}
