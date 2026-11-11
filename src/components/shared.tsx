"use client";
import { uiText } from "../i18n/ui";
import { useEffect, type ReactNode } from "react";
import { LanguageSelector } from "./locale-provider";
export { useLocale } from "./locale-provider";
import { dictionaries, interests, interestLabels, type Interest, type Locale } from "../i18n";
import type { Item, Recommendations } from "./types";
import { ApiError } from "./api";
import { Icon } from "./icons";
import { ItemPhoto } from "./item-photo";
import { MapsLink } from "./maps-link";

export function Shell({ locale, setLocale, children, kiosk = false }: { locale: Locale; setLocale?: (value: Locale) => void; children: ReactNode; kiosk?: boolean }) {
  const t = dictionaries[locale];
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <div className={`ary-app ${kiosk ? "kiosk-app" : ""}`}>
    <a className="skip" href="#main">{t.skipContent}</a>
    <header className="app-header"><a className="brand" href="/#inicio">ARY <span>la Cotorra</span></a>
      <nav aria-label={t.navigation}>
        {!kiosk && <><a href="/experiencia">{t.experience}</a><a href="/mi-cultura"><Icon kind="trips"/>{t.trip}</a><a href="/mis-conversaciones"><Icon kind="conversations"/>{uiText(locale, "myData")}</a></>}
        <a href="/privacidad">{t.privacy}</a>
        {setLocale && <LanguageSelector locale={locale} onChange={setLocale} />}
      </nav>
    </header>
    <main id="main" tabIndex={-1}>{children}</main>
    <footer><span>Ary · {t.demo}</span><a href="/#inicio">{t.home}</a><a href="/terminos">{locale === "es" ? "Términos" : "Terms"}</a></footer>
  </div>;
}
export function ErrorNotice({ error, locale, retry }: { error: unknown; locale: Locale; retry?: () => void }) {
  const t = dictionaries[locale];
  const code = error instanceof ApiError ? error.code : "service_unavailable";
  const message = code === "session_required" ? t.sessionError : code === "rate_limited" ? t.rateError : code === "storage_consent_required" ? (uiText(locale, "authorizeStorageInYourPrivacySettingsTo")) : code === "notice_version_changed" ? (uiText(locale, "thePrivacyNoticeChangedReloadAndReview")) : t.serviceError;
  return <div className="notice error" role="alert"><p>{message}</p>{retry && <button className="secondary" onClick={retry}>{t.retry}</button>}</div>;
}
export function PreferenceForm({ locale, country, selected, onChange, onCountry, onSubmit, onSkip, busy }: { locale: Locale; country: string | null; selected: Interest[]; onChange: (value: Interest[]) => void; onCountry: (value: string | null) => void; onSubmit: () => void; onSkip?: () => void; busy: boolean }) {
  const t = dictionaries[locale];
  const countries = ["AR", "BO", "BR", "CA", "CL", "CN", "CO", "CU", "DE", "DO", "ES", "FR", "GB", "HT", "IT", "JM", "JP", "MX", "PR", "US", "VE"];
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return <form className="preferences" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
    <p>{t.optional}</p>
    <label htmlFor="country">{t.country}</label><select id="country" value={country || ""} onChange={event => onCountry(event.target.value || null)} disabled={busy}><option value="">{t.noCountry}</option>{countries.map(code => <option key={code} value={code}>{names.of(code)}</option>)}</select>
    <fieldset disabled={busy}><legend>{t.yourInterests}</legend><div className="chips">{interests.map(interest => <button type="button" key={interest} aria-pressed={selected.includes(interest)} onClick={() => onChange(selected.includes(interest) ? selected.filter(i => i !== interest) : [...selected, interest])}>{interestLabels[locale][interest]}</button>)}</div></fieldset>
    <div className="actions"><button type="submit" disabled={busy}>{busy ? t.working : t.discover}</button>{onSkip && <button type="button" className="secondary" disabled={busy} onClick={onSkip}>{t.skip}</button>}</div>
  </form>;
}
export function CulturalCard({ item, locale, children, rationale, first = false }: { item: Item; locale: Locale; children?: ReactNode; rationale?: string; first?: boolean }) {
  const t = dictionaries[locale];
  return <article className="cultural-card"><ItemPhoto image={item.image} locale={locale} first={first} /><p className="eyebrow">{t.demo}</p><h2><a href={`/cultura/${item.id}`}>{item.title}</a></h2><p>{item.summary}</p>{rationale && <p className="rationale">{rationale}</p>}
    <MapsLink url={item.mapsUrl} locale={locale} />
    <p className="source">{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">{t.source}: {item.editor}</a>}{item.sourceCheckedAt && <span>{t.reviewed}: {new Date(item.sourceCheckedAt).toLocaleDateString(locale, { timeZone: "UTC" })}</span>}</p>
    <details><summary>{t.question}</summary><p className="eyebrow">{t.example}</p><p>{item.validatedDescription}</p></details>{children}
  </article>;
}
export function RecommendationList({ data, locale, onSave, busy, savedIds }: { data: Recommendations; locale: Locale; onSave: (id: string) => void; busy: boolean; savedIds: string[] }) {
  const t = dictionaries[locale];
  return <><p className="mode">{t.rules}</p><p>{t.bridgeFallback}</p>{data.bridges.map((bridge, i) => <p className="notice" key={i}>{bridge.relation} <a href={bridge.sourceUrl} target="_blank" rel="noreferrer">{t.source}</a></p>)}
    {!data.recommendations.length && <p className="notice">{t.noItems}</p>}
    <div className="card-grid">{data.recommendations.map(row => <CulturalCard key={row.item.id} item={row.item} locale={locale} rationale={row.rationale}><button className="secondary" disabled={busy || savedIds.includes(row.item.id)} onClick={() => onSave(row.item.id)}>{savedIds.includes(row.item.id) ? t.saved : t.save}</button></CulturalCard>)}</div>
  </>;
}
