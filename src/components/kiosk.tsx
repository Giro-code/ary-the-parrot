"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { dictionaries, type Interest } from "../i18n";
import { api, ApiError } from "./api";
import { ErrorNotice, PreferenceForm, RecommendationList, Shell, useLocale } from "./shared";
import type { Recommendations, Visitor } from "./types";

type View = "idle" | "welcome" | "preferences" | "recommendations" | "handoff_qr" | "transferred" | "finished" | "expired";
type Handoff = { svg: string; expiresAt: string; confirmationCode: string };
export function Kiosk() {
  const [locale, setLocale] = useLocale(), t = dictionaries[locale];
  const [view, setView] = useState<View>("idle"), [country, setCountry] = useState<string | null>(null), [selected, setSelected] = useState<Interest[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null), [qr, setQr] = useState<Handoff | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [authorized, setAuthorized] = useState(false), [online, setOnline] = useState(false);
  const [now, setNow] = useState(0), [remainingIdle, setRemainingIdle] = useState(90), [savedIds, setSavedIds] = useState<string[]>([]);
  const lastActivity = useRef(0), epoch = useRef(0), initialCleanup = useRef<Promise<void> | null>(null);
  const cleanSession = useCallback(async () => {
    try { await api("/api/visitor/session/end", "POST", {}); } catch (error) { if (!(error instanceof ApiError && error.code === "session_required")) throw error; }
  }, []);
  const finish = useCallback(async (reason: View = "finished") => {
    epoch.current++; setView(reason); setRecommendations(null); setQr(null); setCountry(null); setSelected([]); setSavedIds([]); setBusy(false); setError(null);
    try { await cleanSession(); } catch (error) { setError(error); }
  }, [cleanSession]);
  useEffect(() => {
    let live = true;
    const check = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (response.ok) {
          initialCleanup.current ??= cleanSession().catch(error => { initialCleanup.current = null; throw error; });
          await initialCleanup.current;
        }
        const device = await api<{ authorized: boolean }>("/api/kiosk/me");
        if (live) { setAuthorized(device.authorized); setOnline(navigator.onLine && response.ok); }
      } catch { if (live) setOnline(false); }
    };
    void check();
    const timer = setInterval(() => void check(), 15000);
    const offline = () => setOnline(false);
    window.addEventListener("online", check); window.addEventListener("offline", offline);
    return () => { live = false; clearInterval(timer); window.removeEventListener("online", check); window.removeEventListener("offline", offline); };
  }, [cleanSession]);
  useEffect(() => {
    if (["idle", "finished", "transferred", "expired"].includes(view)) return;
    const activity = () => { lastActivity.current = Date.now(); };
    const timer = setInterval(() => {
      const current = Date.now(); setNow(current);
      const remaining = Math.max(0, 90 - Math.floor((current - lastActivity.current) / 1000)); setRemainingIdle(remaining);
      if (!remaining) void finish();
      else if (view === "handoff_qr" && qr && Date.parse(qr.expiresAt) <= current) void finish("expired");
    }, 1000);
    window.addEventListener("pointerdown", activity); window.addEventListener("keydown", activity);
    return () => { clearInterval(timer); window.removeEventListener("pointerdown", activity); window.removeEventListener("keydown", activity); };
  }, [view, qr, finish]);
  useEffect(() => {
    if (view !== "handoff_qr") return;
    let live = true;
    const timer = setInterval(() => {
      void api<{ status: string }>("/api/visitor/handoff/status").then(result => {
        if (!live) return;
        if (result.status === "redeemed") void finish("transferred");
        else if (["expired", "cancelled"].includes(result.status)) void finish(result.status === "expired" ? "expired" : "finished");
      }).catch(error => { if (live) setError(error); });
    }, 1500);
    return () => { live = false; clearInterval(timer); };
  }, [view, finish]);
  useEffect(() => {
    if (!["finished", "transferred", "expired"].includes(view)) return;
    const timer = setTimeout(() => { setView("idle"); setLocale("es"); }, 4000);
    return () => clearTimeout(timer);
  }, [view, setLocale]);
  async function run(action: () => Promise<void>) {
    const version = epoch.current; setBusy(true); setError(null);
    try { await action(); } catch (error) { if (version === epoch.current) setError(error); }
    finally { if (version === epoch.current) setBusy(false); }
  }
  function start() { void run(async () => {
    await cleanSession(); await api<{ session: Visitor }>("/api/visitor/session", "POST", { locale });
    lastActivity.current = Date.now(); setRemainingIdle(90); setView("welcome");
  }); }
  function discover(skip = false) { const version = epoch.current; void run(async () => {
    const prefs = { locale, countryDeclared: skip ? null : country, interests: skip ? [] : selected };
    await api("/api/visitor/preferences", "PATCH", prefs);
    const result = await api<Recommendations>("/api/recommendations", "POST", {});
    if (epoch.current !== version) return;
    if (skip) { setCountry(null); setSelected([]); }
    setRecommendations(result); setView("recommendations");
  }); }
  function generateQr() { const version = epoch.current; void run(async () => {
    const result = await api<Handoff>("/api/visitor/handoff", "POST", {});
    if (epoch.current !== version) return;
    setNow(Date.now()); setQr(result); setView("handoff_qr");
  }); }
  return <Shell locale={locale} kiosk>
    <div className="status-bar"><span className={`status ${online ? "connected" : "disconnected"}`} role="status">{online ? t.online : t.offline}</span><span>{t.simulator}</span><span>{authorized ? t.authorized : t.demoDevice}</span></div>
    {!online && <p className="notice" role="status">{t.offlineHelp}</p>}
    {error !== null && <ErrorNotice error={error} locale={locale} retry={() => window.location.reload()} />}
    <section className="kiosk-content" data-state={view}>
      {view === "idle" && <div className="kiosk-welcome"><div><p className="eyebrow">República Dominicana · Ary</p><h1>{t.welcome}</h1><p className="lead">{t.intro}</p><button disabled={busy || !online} onClick={start}>{busy ? t.working : t.start}</button>{!authorized && <p className="muted">{t.demoDeviceHelp}</p>}</div><Image src="/assets/ary-la-cotorra.png" alt="Ary la Cotorra" width={300} height={400} sizes="(max-width: 640px) 180px, 300px" className="mascot" priority /></div>}
      {view === "welcome" && <div className="flow-panel"><p className="eyebrow">01 / 03</p><h1>{t.chooseLanguage}</h1><div className="language large">{(["es", "en"] as const).map(value => <button key={value} aria-pressed={locale === value} onClick={() => setLocale(value)} lang={value}>{value === "es" ? "Español" : "English"}</button>)}</div><button onClick={() => setView("preferences")}>{t.continue}</button></div>}
      {view === "preferences" && <div className="flow-panel"><p className="eyebrow">02 / 03</p><h1>{t.preferences}</h1><PreferenceForm locale={locale} country={country} selected={selected} onChange={setSelected} onCountry={setCountry} busy={busy || !online} onSubmit={() => discover()} onSkip={() => discover(true)} /></div>}
      {view === "recommendations" && recommendations && <><p className="eyebrow">03 / 03</p><h1>{t.recommendations}</h1><RecommendationList data={recommendations} locale={locale} busy={busy} savedIds={savedIds} onSave={id => { const version = epoch.current; void run(async () => { await api("/api/saved", "POST", { itemId: id }); if (version === epoch.current) setSavedIds(ids => [...ids, id]); }); }} /><div className="actions sticky-actions"><button onClick={generateQr} disabled={busy || !online || !authorized}>{t.handoff}</button><button className="secondary" disabled={busy} onClick={() => setView("preferences")}>{t.edit}</button></div>{!authorized && <p>{t.demoDeviceHelp}</p>}</>}
      {view === "handoff_qr" && qr && <div className="handoff-panel"><div><h1>{t.scan}</h1><p className="lead">{t.scanHelp}</p><p>{t.confirmation}</p><strong className="confirmation-code">{qr.confirmationCode}</strong><p aria-live="off">{t.expires} <strong>{Math.max(0, Math.ceil((Date.parse(qr.expiresAt) - now) / 1000))} {t.seconds}</strong></p><p>{t.qrPrivacy}</p></div><Image src={`data:image/svg+xml,${encodeURIComponent(qr.svg)}`} alt={t.handoff} width={280} height={280} unoptimized className="qr-image" /></div>}
      {["finished", "transferred", "expired"].includes(view) && <div className="flow-panel" role="status"><h1>{view === "transferred" ? t.transferred : view === "expired" ? t.expiredKiosk : t.finished}</h1></div>}
    </section>
    {!["idle", "finished", "transferred", "expired"].includes(view) && <div className="session-controls">{remainingIdle <= 20 && <div className="notice" role="alert">{t.idleSoon} {remainingIdle} {t.seconds}. <button className="secondary" onClick={() => { lastActivity.current = Date.now(); setRemainingIdle(90); }}>{t.stay}</button></div>}<button className="secondary" onClick={() => void finish()}>{t.finish}</button></div>}
  </Shell>;
}
