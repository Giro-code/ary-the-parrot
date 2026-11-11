"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { StaffError } from "./staff-shared";
import { ItemPhoto } from "./item-photo";
import type { staffCatalog } from "../server/catalog-admin";
type Data = Awaited<ReturnType<typeof staffCatalog>>;
export function CatalogManager() {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ query: "", type: "", region: "", origin: "", visibility: "" });
  const [applied, setApplied] = useState(filters);
  const load = useCallback(async () => {
    try { const result = await api<Data>(`/api/admin/catalog?${new URLSearchParams(applied)}`); setData(result); setError(null); } catch (e) { setError(e); } finally { setLoading(false); }
  }, [applied]);
  useEffect(() => {
    let active = true;
    api<Data>(`/api/admin/catalog?${new URLSearchParams(applied)}`).then(result => {
      if (active) { setData(result); setError(null); }
    }).catch(error => { if (active) setError(error); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied]);
  async function toggle(row: Data["items"][number]) {
    setBusy(true); setMessage("");
    try { await api(`/api/admin/catalog/${row.id}`, "PATCH", { hidden: !row.hidden }); setMessage(row.hidden ? "Ficha visible en español e inglés." : "Ficha oculta en español e inglés."); await load(); } catch (e) { setError(e); } finally { setBusy(false); }
  }
  return <><p>Consulta las fichas y controla su visibilidad en Ary.</p><form className="staff-toolbar catalog-filters" onSubmit={e => { e.preventDefault(); setLoading(true); setApplied({ ...filters }); }}>
    <label>Buscar<input value={filters.query} maxLength={500} onChange={e => setFilters({ ...filters, query: e.target.value })} /></label>
    {(["type", "region", "origin", "visibility"] as const).map(key => <label key={key}>{({ type: "Tipo", region: "Provincia", origin: "Origen", visibility: "Visibilidad" })[key]}<select value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}><option value="">Todos</option>{(key === "type" ? data?.types || [] : key === "region" ? data?.regions || [] : key === "origin" ? ["seed", "catalog"] : ["visible", "hidden"]).map(value => <option key={value} value={value}>{({ seed: "Seed", catalog: "Catálogo", visible: "Visible", hidden: "Oculta" } as Record<string, string>)[value] || value}</option>)}</select></label>)}
    <button disabled={loading || busy}>Buscar fichas</button></form>
    <StaffError error={error} retry={() => void load()} />{message && <p role="status">{message}</p>}{loading && <p role="status">Cargando catálogo…</p>}
    {data && <><p role="status">{data.items.length} fichas</p>{!data.items.length && <p>No hay fichas con estos filtros. Cambia la búsqueda para ver otros resultados.</p>}<div className="catalog-results" aria-busy={loading}>{data.items.map(row => <article className="staff-record catalog-record" key={row.contentKey}>
      <ItemPhoto image={row.image} locale="es" /><div><h2>{row.titles.es || row.titles.en}</h2><p lang="en">{row.titles.en}</p><p>{row.summary}</p><p>{row.type} · {row.region} · {row.origin === "seed" ? "Seed" : "Catálogo"} · {row.hidden ? "Oculta" : "Visible"}</p><p>{row.facts} hechos · {row.sources.length} fuentes</p><ul>{row.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.editor}</a></li>)}</ul><button className="secondary" disabled={busy || loading} onClick={() => void toggle(row)}>{row.hidden ? "Mostrar" : "Ocultar"}</button></div>
    </article>)}</div></>}
  </>;
}
