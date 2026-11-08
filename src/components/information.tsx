"use client";
import { dictionaries, type Locale } from "../i18n";
import { Shell, useLocale } from "./shared";
export function Information({ kind, hours = 24, initialLocale = "es" }: { kind: "privacy" | "recovery"; hours?: number; initialLocale?: Locale }) {
  const [locale, setLocale] = useLocale(initialLocale), t = dictionaries[locale];
  return <Shell locale={locale} setLocale={setLocale}><article className="flow-panel prose"><p className="eyebrow">Ary</p><h1>{kind === "privacy" ? t.privacyTitle : t.soon}</h1>{kind === "privacy" ? <><p>{t.privacyIntro}</p><p>{t.privacyCookies}</p><p>{t.privacyRetention} {hours} {t.hours}</p><p>{t.privacyAnalytics}</p><p className="notice">{t.legalReview}</p></> : <><p>{t.soonHelp}</p><a className="button" href="/experiencia">{t.experience}</a></>}</article></Shell>;
}
