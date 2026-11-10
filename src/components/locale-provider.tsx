"use client";
import { uiText } from "../i18n/ui";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { LANGUAGE_COOKIE, LANGUAGE_MAX_AGE, supportedLocale, SUPPORTED_LANGUAGES, type Locale } from "../i18n/language";

const LocaleContext = createContext<readonly [Locale, (value: Locale) => void] | null>(null);
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState(initialLocale);
  return <LocaleContext.Provider value={[locale, setLocale]}>{children}</LocaleContext.Provider>;
}
export function readLanguageCookie() { return supportedLocale(document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${LANGUAGE_COOKIE}=`))?.split("=")[1]); }
export function rememberLanguage(locale: Locale) { document.cookie = `${LANGUAGE_COOKIE}=${locale}; Path=/; Max-Age=${LANGUAGE_MAX_AGE}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; }
export function useLocale(initial: Locale = "en"): readonly [Locale, (value: Locale) => void] {
  const context = useContext(LocaleContext), [local, setLocal] = useState(initial);
  const set = useCallback((value: Locale) => { setLocal(value); }, []);
  return context || [local, set];
}
export function LanguageSelector({ locale, onChange }: { locale: Locale; onChange: (value: Locale) => void }) {
  return <div className="language" role="group" aria-label={uiText(locale, "chooseYourLanguage")}>{(Object.keys(SUPPORTED_LANGUAGES) as Locale[]).map(value => <button type="button" key={value} lang={value} aria-pressed={value === locale} onClick={() => { rememberLanguage(value); onChange(value); }}>{SUPPORTED_LANGUAGES[value]}</button>)}</div>;
}
