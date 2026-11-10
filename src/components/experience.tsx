"use client";
import { uiText } from "../i18n/ui";
import { useEffect, useRef, useState } from "react";
import { readLanguageCookie } from "./locale-provider";
import { interestLabels } from "../i18n";
import { api, ApiError } from "./api";
import type { Saved, Visitor } from "./types";
import { useLocale } from "./shared";
import { VoiceShell } from "./voice-shell";
import { AryChat } from "./ary-chat";
import { ProviderOffers } from "./provider-offers";
import { conversationPreferences, type ConversationPreferences } from "../conversation";
export function Experience({ sharingEnabled = false, offlineImageAvailable = false }: { sharingEnabled?: boolean; offlineImageAvailable?: boolean }) {
  const [locale, setLocale] = useLocale(), [visitor, setVisitor] = useState<Visitor | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true), [error, setError] = useState(false), [savedIds, setSavedIds] = useState<string[]>([]), [savedItems, setSavedItems] = useState<Saved[]>([]), [celebrating, setCelebrating] = useState(false), [sessionKey, setSessionKey] = useState(0), [startedHere, setStartedHere] = useState(false);
  const current = useRef<Visitor | null>(null), generation = useRef(0), celebration = useRef<ReturnType<typeof setTimeout> | null>(null);
  function restore(session: Visitor) { current.current = session; setVisitor(session); setLocale(session.locale); }
  useEffect(() => {
    let live = true, timer: ReturnType<typeof setTimeout>;
    const check = async () => { let available = false; try { available = navigator.onLine && (await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(4000) })).ok; } catch { /* retry below */ } if (live) { setOnline(available); timer = setTimeout(() => void check(), available ? 15000 : 2000); } };
    const offline = () => setOnline(false), online = () => { clearTimeout(timer); void check(); }; void check(); window.addEventListener("offline", offline); window.addEventListener("online", online);
    void api<{ session: Visitor }>("/api/visitor/me").then(async result => { if (!live) return; const preferred = readLanguageCookie() || locale;
      if (result.session.locale !== preferred) { const updated = await api<{ session: Visitor }>("/api/visitor/preferences", "PATCH", { locale: preferred, countryDeclared: result.session.countryDeclared, interests: result.session.interests }); if (!live) return; restore(updated.session); } else restore(result.session); const saved = await api<{ items: Saved[] }>("/api/saved"); if (live) { setSavedIds(saved.items.map(row => row.item.id)); setSavedItems(saved.items); } }).catch(error => { if (live && !(error instanceof ApiError && error.code === "session_required")) setError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; clearTimeout(timer); window.removeEventListener("offline", offline); window.removeEventListener("online", online); if (celebration.current) clearTimeout(celebration.current); };
    // Restore once; explicit conversation actions update language and preferences.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function start() { setBusy(true); setError(false); try { const result = await api<{ session: Visitor }>("/api/visitor/session", "POST", { locale }); restore(result.session); setStartedHere(true); setSessionKey(key => key + 1); } catch { setError(true); } finally { setBusy(false); } }
  async function updatePreferences(text: string, value?: ConversationPreferences) { if (!current.current) return; const version = generation.current, next = value || conversationPreferences(text, current.current); if (JSON.stringify(next) === JSON.stringify({ locale: current.current.locale, countryDeclared: current.current.countryDeclared, interests: current.current.interests })) return; const result = await api<{ session: Visitor }>("/api/visitor/preferences", "PATCH", next); if (version === generation.current) { restore(result.session); if (current.current?.locale === next.locale) { const saved = await api<{ items: Saved[] }>("/api/saved"); if (version === generation.current) setSavedItems(saved.items); } } }
  async function save(id: string) { const version = generation.current; await api("/api/saved", "POST", { itemId: id }); if (version === generation.current) { setSavedIds(ids => [...new Set([...ids, id])]); setCelebrating(true); if (celebration.current) clearTimeout(celebration.current); celebration.current = setTimeout(() => setCelebrating(false), 2500); } }
  async function finish() { setBusy(true); generation.current++; current.current = null; setVisitor(null); setSavedIds([]); setSavedItems([]); setCelebrating(false); setSessionKey(key => key + 1); try { await api("/api/visitor/session/end", "POST", {}); } catch { setError(true); } finally { setBusy(false); } }
  return <VoiceShell locale={locale} setLocale={value => { setLocale(value); if (current.current) void updatePreferences(value === "es" ? "Español" : "English").catch(() => setError(true)); }}><AryChat key={`${sessionKey}-${!!visitor}`} locale={locale} active={!!visitor} online={online} disabled={busy || loading} playWelcome={startedHere} onStart={() => void start()} onPreferences={updatePreferences} savedIds={savedIds} savedItems={savedItems} onSave={save} celebrating={celebrating} offlineImageAvailable={offlineImageAvailable}
    status={<div className="voice-status">{loading ? <span role="status">{uiText(locale, "loading")}</span> : visitor ? <span data-testid="visitor-selections">{uiText(locale, "language")}: {visitor.locale.toUpperCase()}{visitor.countryDeclared && ` · ${new Intl.DisplayNames([locale], { type: "region" }).of(visitor.countryDeclared)}`}{visitor.interests.length > 0 && ` · ${visitor.interests.map(i => interestLabels[locale][i]).join(", ")}`}</span> : <span>{uiText(locale, "noEmailOrAccountNeeded")}</span>}{!online && <span role="status">{uiText(locale, "serviceOffline")}</span>}{error && <span role="alert">{uiText(locale, "iCouldnTCompleteThatReloadTo")}</span>}</div>}
    endControls={visitor && <div className="experience-controls"><a href="/mi-viaje">{uiText(locale, "seeSavedPlaces")}</a><button className="text-button finish-chat" onClick={() => void finish()}>{uiText(locale, "endMySession")}</button></div>} />
    {visitor && <details className="experience-more"><summary>{uiText(locale, "moreForYourTrip")}</summary><a href={`/reingresar?lang=${locale}`}>{uiText(locale, "saveMyExperienceAndReceiveAnEmail")}</a><p>{uiText(locale, "yourTemporaryAccessExpiresOn")} {new Date(visitor.expiresAt).toLocaleString(locale)}.</p><ProviderOffers enabled={sharingEnabled} locale={locale} /></details>}
  </VoiceShell>;
}
