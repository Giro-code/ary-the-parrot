"use client";
import { useEffect, useState } from "react";
import { dictionaries, interestLabels, type Interest } from "../i18n";
import { api, ApiError } from "./api";
import type { Recommendations, Saved, Visitor } from "./types";
import { ErrorNotice, PreferenceForm, RecommendationList, Shell, useLocale } from "./shared";
import { AryChat } from "./ary-chat";
import { ProviderOffers } from "./provider-offers";
export function Experience({ sharingEnabled = false }: { sharingEnabled?: boolean }) {
  const [locale, setLocale] = useLocale(), t = dictionaries[locale];
  const [visitor, setVisitor] = useState<Visitor | null>(null), [loading, setLoading] = useState(true), [editing, setEditing] = useState(false);
  const [country, setCountry] = useState<string | null>(null), [selected, setSelected] = useState<Interest[]>([]), [data, setData] = useState<Recommendations | null>(null), [savedIds, setSavedIds] = useState<string[]>([]);
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false);
  function restore(session: Visitor) { setVisitor(session); setLocale(session.locale); setCountry(session.countryDeclared); setSelected(session.interests); }
  async function refresh() {
    const [result, saved] = await Promise.all([api<Recommendations>("/api/recommendations", "POST", {}), api<{ items: Saved[] }>("/api/saved")]);
    setData(result); setSavedIds(saved.items.map(row => row.item.id));
  }
  useEffect(() => {
    let live = true;
    void api<{ session: Visitor }>("/api/visitor/me").then(async result => { if (!live) return; restore(result.session); await refresh(); }).catch(error => { if (live && !(error instanceof ApiError && error.code === "session_required")) setError(error); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // Restoration runs once; locale changes are explicit form actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function run(action: () => Promise<void>) { setBusy(true); setError(null); try { await action(); } catch (error) { setError(error); } finally { setBusy(false); } }
  return <Shell locale={locale} setLocale={value => { setLocale(value); if (visitor) setEditing(true); }}>
    {loading ? <p className="notice" role="status">{t.loading}</p> : !visitor ? <section className="flow-panel"><p className="eyebrow">Ary · {t.anonymous}</p><h1>{t.noSession}</h1><p>{t.noSessionHelp}</p><button disabled={busy} onClick={() => void run(async () => { const result = await api<{ session: Visitor }>("/api/visitor/session", "POST", { locale }); restore(result.session); setEditing(true); })}>{busy ? t.working : t.start}</button></section> : <>
      <div className="page-intro"><p className="eyebrow">{visitor.accountVerified ? (locale === "en" ? "Verified account" : "Cuenta verificada") : t.anonymous}</p><h1>{t.hello}</h1><p>{t.restored}</p><p className="session-expiry">{t.sessionExpiry} <time dateTime={visitor.expiresAt}>{new Date(visitor.expiresAt).toLocaleString(locale)}</time>.</p></div>
      <div className="visitor-summary" data-testid="visitor-selections"><span>{t.languageLabel}: {visitor.locale.toUpperCase()}</span>{visitor.countryDeclared && <span>{new Intl.DisplayNames([locale], { type: "region" }).of(visitor.countryDeclared)}</span>}<span>{visitor.interests.map(i => interestLabels[locale][i]).join(" · ") || t.noInterests}</span></div>
      {editing ? <section><h2>{t.preferences}</h2><PreferenceForm locale={locale} country={country} selected={selected} onCountry={setCountry} onChange={setSelected} busy={busy} onSubmit={() => void run(async () => { const result = await api<{ session: Visitor }>("/api/visitor/preferences", "PATCH", { locale, countryDeclared: country, interests: selected }); restore(result.session); await refresh(); setEditing(false); })} /></section> : <button className="secondary" onClick={() => setEditing(true)}>{t.edit}</button>}
      {data && <section className="recommendations"><h2 className="section-title">{t.recommendations}</h2><RecommendationList data={data} locale={locale} busy={busy} savedIds={savedIds} onSave={id => void run(async () => { await api("/api/saved", "POST", { itemId: id }); setSavedIds(ids => [...ids, id]); })} /></section>}
      {data && <AryChat locale={locale} disabled={busy || editing} />}
      {data && <ProviderOffers enabled={sharingEnabled} locale={locale} />}
      <aside className="email-cta"><a className="button secondary" href={`/reingresar?lang=${locale}`}>{t.emailCta}</a><p><a href="/cuenta/privacidad">{locale === "en" ? "Manage my data and consents" : "Gestionar mis datos y consentimientos"}</a></p></aside>
      <button className="secondary" disabled={busy} onClick={() => void run(async () => { await api("/api/visitor/session/end", "POST", {}); setVisitor(null); setData(null); setSelected([]); setCountry(null); setSavedIds([]); })}>{t.clearSession}</button>
    </>}
    {error !== null && <ErrorNotice error={error} locale={locale} retry={() => window.location.reload()} />}
  </Shell>;
}
