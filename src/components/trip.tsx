"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { dictionaries } from "../i18n";
import { api } from "./api";
import { CulturalCard, ErrorNotice, Shell, useLocale } from "./shared";
import type { Saved, Visitor } from "./types";
export function Trip() {
  const [locale, setLocale] = useLocale(), t = dictionaries[locale];
  const [rows, setRows] = useState<Saved[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [share, setShare] = useState<string | null>(null);
  async function load() { const result = await api<{ items: Saved[] }>("/api/saved"); setRows(result.items); }
  useEffect(() => {
    void api<{ session: Visitor }>("/api/visitor/me").then(async result => { setLocale(result.session.locale); await load(); }).catch(setError).finally(() => setLoading(false));
  }, [setLocale]);
  async function update(id: string, changes: { state?: "saved" | "visited" | "removed"; favorite?: boolean }) {
    setBusy(true); setError(null);
    try { await api(`/api/saved/${id}`, "PATCH", changes); await load(); } catch (error) { setError(error); } finally { setBusy(false); }
  }
  const completed = rows.filter(row => row.saved.state === "visited").length;
  return <Shell locale={locale} setLocale={setLocale}><p className="eyebrow">Ary</p><h1>{t.tripTitle}</h1>
    {loading ? <p role="status">{t.loading}</p> : rows.length ? <><div className="progress"><label htmlFor="trip-progress">{completed} / {rows.length} {t.progress}</label><progress id="trip-progress" max={rows.length} value={completed} /></div><div className="card-grid">{rows.map(row => <CulturalCard key={row.saved.id} item={row.item} locale={locale}><div className="saved-controls"><label htmlFor={`state-${row.saved.id}`}>{t.trip}</label><select id={`state-${row.saved.id}`} value={row.saved.state} disabled={busy} onChange={event => void update(row.saved.id, { state: event.target.value as "saved" | "visited" })}><option value="saved">{t.pending}</option><option value="visited">{t.visited}</option></select><button className="secondary" aria-pressed={row.saved.favorite} disabled={busy} onClick={() => void update(row.saved.id, { favorite: !row.saved.favorite })}>{row.saved.favorite ? t.unmarkFavorite : t.markFavorite}</button><button className="secondary" onClick={() => setShare(share === row.item.id ? null : row.item.id)} aria-expanded={share === row.item.id}>{t.share}</button><button className="text-button" disabled={busy} onClick={() => void update(row.saved.id, { state: "removed" })}>{t.remove}</button></div>{share === row.item.id && <div className="public-share"><p>{t.publicQr}</p><Image src={`/cultura/${row.item.id}/qr`} alt={t.publicQr} width={220} height={220} unoptimized /><a href={`/cultura/${row.item.id}`}>{row.item.title}</a></div>}</CulturalCard>)}</div></> : <section className="notice"><h2>{t.emptyTrip}</h2><p>{t.emptyTripHelp}</p><a className="button" href="/experiencia">{t.experience}</a></section>}
    <aside className="email-cta"><a className="button secondary" href={`/reingresar?lang=${locale}`}>{t.emailCta}</a><p><a href="/cuenta/privacidad">{locale === "en" ? "Manage my data and consents" : "Gestionar mis datos y consentimientos"}</a></p></aside>
    {error !== null && <ErrorNotice error={error} locale={locale} retry={() => window.location.reload()} />}
  </Shell>;
}
