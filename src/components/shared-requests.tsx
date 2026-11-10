"use client";
import { uiText } from "../i18n/ui";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
export function SharedRequests({ locale }: { locale: "es" | "en" }) {
  const [rows, setRows] = useState<{ id: string; providerName: string; fields: string[]; revokedAt: string | null; expiresAt: string }[]>([]), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const load = useCallback(() => api<{ leads: typeof rows }>("/api/visitor/leads").then(result => { setRows(result.leads); setError(false); }).catch(() => setError(true)), []);
  useEffect(() => { void load(); }, [load]);
  return <section><h2>{uiText(locale, "sharedRequests")}</h2><p>{uiText(locale, "revokingBlocksFutureAccessInformationAlreadyViewed")}</p>{!rows.length && !error && <p>{uiText(locale, "noSharedRequests")}</p>}{rows.map(row => <article className="staff-record" key={row.id}><h3>{row.providerName}</h3><p>{row.fields.join(", ")} · {new Date(row.expiresAt).toLocaleDateString(locale)} · {row.revokedAt ? (uiText(locale, "revoked2")) : (uiText(locale, "authorized"))}</p><button className="secondary" disabled={busy || !!row.revokedAt} onClick={() => { setBusy(true); void api(`/api/visitor/leads/${row.id}`, "DELETE", {}).then(load).catch(() => setError(true)).finally(() => setBusy(false)); }}>{uiText(locale, "revokeRequest")}</button></article>)}{error && <p role="alert">{uiText(locale, "couldNotLoadOrUpdateRequests")} <button className="secondary" onClick={() => void load()}>{uiText(locale, "retry")}</button></p>}</section>;
}
