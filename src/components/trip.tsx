"use client";
import { uiText } from "../i18n/ui";
import Image from "next/image";
import { useEffect, useState } from "react";
import { dictionaries } from "../i18n";
import { api } from "./api";
import { CulturalCard, ErrorNotice, Shell, useLocale } from "./shared";
import type { Saved, Visitor } from "./types";
import { ProviderOffers } from "./provider-offers";
export function Trip({ sharingEnabled = false }: { sharingEnabled?: boolean }) {
  const [locale, setLocale] = useLocale(), t = dictionaries[locale];
  const [rows, setRows] = useState<Saved[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [share, setShare] = useState<string | null>(null);
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  async function load() { const [result, named] = await Promise.all([api<{ items: Saved[] }>("/api/saved"), api<{ places: { id: string; name: string }[] }>("/api/trip-places")]); setRows(result.items); setPlaces(named.places); }
  useEffect(() => {
    void api<{ session: Visitor }>("/api/visitor/me").then(async result => { if (result.session.locale !== locale) await api("/api/visitor/preferences", "PATCH", { locale, interests: result.session.interests, countryDeclared: result.session.countryDeclared }); await load(); }).catch(setError).finally(() => setLoading(false));
  // Locale is decided by the server; do not overwrite it with an old session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function update(id: string, changes: { state?: "saved" | "visited" | "removed"; favorite?: boolean }) {
    setBusy(true); setError(null);
    try { await api(`/api/saved/${id}`, "PATCH", changes); await load(); } catch (error) { setError(error); } finally { setBusy(false); }
  }
  const completed = rows.filter(row => row.saved.state === "visited").length;
  return <Shell locale={locale} setLocale={value => { setLocale(value); void api<{ session: Visitor }>("/api/visitor/me").then(async result => { await api("/api/visitor/preferences", "PATCH", { locale: value, countryDeclared: result.session.countryDeclared, interests: result.session.interests }); await load(); }).catch(setError); }}><p className="eyebrow">Ary</p><h1>{t.tripTitle}</h1><p>{t.tripSubtitle}</p>
    {loading ? <p role="status">{t.loading}</p> : rows.length ? <><div className="progress"><label htmlFor="trip-progress">{completed} / {rows.length} {t.progress}</label><progress id="trip-progress" max={rows.length} value={completed} /></div><div className="card-grid">{rows.map((row, index) => <CulturalCard key={row.saved.id} item={row.item} locale={locale} first={index === 0}><div className="saved-controls"><label htmlFor={`state-${row.saved.id}`}>{t.trip}</label><select id={`state-${row.saved.id}`} value={row.saved.state} disabled={busy} onChange={event => void update(row.saved.id, { state: event.target.value as "saved" | "visited" })}><option value="saved">{t.pending}</option><option value="visited">{t.visited}</option></select><button className="secondary" aria-pressed={row.saved.favorite} disabled={busy} onClick={() => void update(row.saved.id, { favorite: !row.saved.favorite })}>{row.saved.favorite ? t.unmarkFavorite : t.markFavorite}</button><button className="secondary" onClick={() => setShare(share === row.item.id ? null : row.item.id)} aria-expanded={share === row.item.id}>{t.share}</button><button className="text-button" disabled={busy} onClick={() => void update(row.saved.id, { state: "removed" })}>{t.remove}</button></div>{share === row.item.id && <div className="public-share"><p>{t.publicQr}</p><Image src={`/cultura/${row.item.id}/qr`} alt={t.publicQr} width={220} height={220} unoptimized /><a href={`/cultura/${row.item.id}`}>{row.item.title}</a></div>}</CulturalCard>)}</div></> : places.length ? null : <section className="notice culture-empty"><Image src="/assets/ary/ary-presentar.webp" width={120} height={120} alt={locale === "es" ? "Ary te saluda" : "Ary waving hello"}/><div><h2>{t.emptyTrip}</h2><p>{t.emptyTripHelp}</p><a className="button" href="/experiencia">{t.experience}</a></div></section>}
    {!loading && places.length > 0 && <section className="named-places"><h2>{locale === "es" ? "Lugares que quieres conocer" : "Places you want to discover"}</h2><p>{locale === "es" ? "Guardados a partir de tus palabras. La ubicación aún no está verificada; consulta fuentes oficiales antes de salir." : "Saved from your own words. Locations are not yet verified; check official sources before setting off."}</p><ul>{places.map(place => <li key={place.id}><strong>{place.name}</strong><button className="text-button" disabled={busy} onClick={() => { setBusy(true); void api(`/api/trip-places/${place.id}`, "DELETE", {}).then(load).catch(setError).finally(() => setBusy(false)); }}>{locale === "es" ? "Quitar" : "Remove"}</button></li>)}</ul></section>}
    {!loading && error === null && <ProviderOffers enabled={sharingEnabled} locale={locale} />}
    <aside className="email-cta"><a className="button secondary" href={`/reingresar?lang=${locale}`}>{t.emailCta}</a><p><a href="/cuenta/privacidad">{uiText(locale, "manageMyDataAndConsents")}</a></p></aside>
    {error !== null && <ErrorNotice error={error} locale={locale} retry={() => window.location.reload()} />}
  </Shell>;
}
