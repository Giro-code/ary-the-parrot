"use client";
import { uiText, gestureText } from "../i18n/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { dictionaries, type Locale } from "../i18n";
import { api, ApiError } from "./api";
import { useLocale } from "./shared";
import { VoiceShell } from "./voice-shell";
import { AryChat, type ChatActivity, type Handoff } from "./ary-chat";
import { useRobot } from "./use-robot";
import { type RobotState } from "../robot/protocol";
import { conversationPreferences, type ConversationPreferences } from "../conversation";
import type { Visitor } from "./types";

type View = "idle" | "presence" | "conversation" | "handoff_qr" | "transferred" | "finished" | "expired";
export function Kiosk({ offlineImageAvailable = false, defaultLocale = "en" }: { offlineImageAvailable?: boolean; defaultLocale?: Locale }) {
  const [locale, setLocale] = useLocale(defaultLocale), t = dictionaries[locale];
  const [view, setView] = useState<View>("idle"), [qr, setQr] = useState<Handoff | null>(null);
  const [sessionKey, setSessionKey] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(false), [authorized, setAuthorized] = useState<boolean | null>(null), [online, setOnline] = useState(false), [checking, setChecking] = useState(true);
  const [chatActivity, setChatActivity] = useState<ChatActivity>("idle"), [celebrating, setCelebrating] = useState(false);
  const [now, setNow] = useState(0), [remainingIdle, setRemainingIdle] = useState(90), [savedIds, setSavedIds] = useState<string[]>([]);
  const lastActivity = useRef(0), epoch = useRef(0), initialCleanup = useRef<Promise<void> | null>(null), celebration = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefs = useRef<ConversationPreferences>({ locale: defaultLocale, countryDeclared: null, interests: [] });
  const active = view === "conversation" || view === "handoff_qr";
  const robotState: RobotState = checking ? "idle" : !online ? "offline" : error ? "error" : busy ? "thinking" : celebrating ? "welcome" : view === "handoff_qr" ? "handoff_qr" : active ? chatActivity : view === "presence" ? "welcome" : "idle";
  const robot = useRobot(robotState, authorized === true, () => { if (view === "idle") setView("presence"); });
  const cleanSession = useCallback(async () => { try { await api("/api/visitor/session/end", "POST", {}, AbortSignal.timeout(4000)); } catch (error) { if (!(error instanceof ApiError && error.code === "session_required")) throw error; } }, []);
  const finish = useCallback(async (reason: View = "finished") => {
    epoch.current++; setLocale(defaultLocale); setSessionKey(key => key + 1); setView(reason); setQr(null); setSavedIds([]); setBusy(false); setError(false); setChatActivity("idle"); setCelebrating(reason === "transferred"); prefs.current = { locale: defaultLocale, countryDeclared: null, interests: [] };
    if (celebration.current) clearTimeout(celebration.current);
    if (reason === "transferred") celebration.current = setTimeout(() => setCelebrating(false), 2500);
    try { await cleanSession(); } catch { setError(true); initialCleanup.current = null; }
  }, [cleanSession, defaultLocale, setLocale]);
  useEffect(() => {
    let live = true, running = false, failures = 0; let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      if (running || !live) return; running = true; clearTimeout(timer); let available = false;
      try {
        const response = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(4000) });
        const device = await api<{ authorized: boolean }>("/api/kiosk/me", "GET", undefined, AbortSignal.timeout(4000)); if (live) setAuthorized(device.authorized);
        if (response.ok) { initialCleanup.current ??= cleanSession().catch(error => { initialCleanup.current = null; throw error; }); await initialCleanup.current; }
        available = navigator.onLine && response.ok;
      } catch { available = false; }
      finally { running = false; if (live) { setOnline(available); setChecking(false); const delay = available ? 15000 : Math.min(15000, 1000 * 2 ** Math.min(failures++, 4)); if (available) failures = 0; timer = setTimeout(() => void check(), delay); } }
    };
    void check(); const offline = () => { setOnline(false); failures = 0; clearTimeout(timer); timer = setTimeout(() => void check(), 1000); };
    window.addEventListener("online", check); window.addEventListener("offline", offline);
    return () => { live = false; clearTimeout(timer); window.removeEventListener("online", check); window.removeEventListener("offline", offline); };
  }, [cleanSession]);
  useEffect(() => {
    if (!active) return;
    const activity = () => { lastActivity.current = Date.now(); };
    const timer = setInterval(() => { const current = Date.now(); setNow(current); const remaining = Math.max(0, 90 - Math.floor((current - lastActivity.current) / 1000)); setRemainingIdle(remaining); if (!remaining) void finish(); else if (qr && Date.parse(qr.expiresAt) <= current) void finish("expired"); }, 1000);
    window.addEventListener("pointerdown", activity); window.addEventListener("keydown", activity);
    return () => { clearInterval(timer); window.removeEventListener("pointerdown", activity); window.removeEventListener("keydown", activity); };
  }, [active, qr, finish]);
  useEffect(() => {
    if (!qr || !online) return; let live = true;
    const timer = setInterval(() => { void api<{ status: string }>("/api/visitor/handoff/status").then(result => { if (!live) return; if (result.status === "redeemed") void finish("transferred"); else if (["expired", "cancelled"].includes(result.status)) void finish(result.status === "expired" ? "expired" : "finished"); }).catch(() => { if (live) setError(true); }); }, 1500);
    return () => { live = false; clearInterval(timer); };
  }, [qr, online, finish]);
  useEffect(() => { if (!["finished", "transferred", "expired"].includes(view)) return; const timer = setTimeout(() => { setView("idle"); setLocale(defaultLocale); setCelebrating(false); }, 4000); return () => clearTimeout(timer); }, [view, setLocale, defaultLocale]);
  useEffect(() => () => { if (celebration.current) clearTimeout(celebration.current); }, []);
  function celebrate() { setCelebrating(true); if (celebration.current) clearTimeout(celebration.current); celebration.current = setTimeout(() => setCelebrating(false), 2500); }
  async function start() { if (busy || !online) return; const version = ++epoch.current; setBusy(true); setError(false); try { await cleanSession(); const result = await api<{ session: Visitor }>("/api/visitor/session", "POST", { locale, kiosk: true }); if (epoch.current !== version) return; prefs.current = { locale: result.session.locale, countryDeclared: result.session.countryDeclared, interests: result.session.interests }; lastActivity.current = Date.now(); setRemainingIdle(90); setView("conversation"); } catch { if (epoch.current === version) setError(true); } finally { if (epoch.current === version) setBusy(false); } }
  async function updatePreferences(text: string, value?: ConversationPreferences) { const version = epoch.current, next = value || conversationPreferences(text, prefs.current); if (JSON.stringify(next) === JSON.stringify(prefs.current)) return; const result = await api<{ session: Visitor }>("/api/visitor/preferences", "PATCH", next); if (epoch.current !== version) return; prefs.current = { locale: result.session.locale, countryDeclared: result.session.countryDeclared, interests: result.session.interests }; setLocale(result.session.locale); }
  async function save(id: string) { const version = epoch.current; await api("/api/saved", "POST", { itemId: id }); if (version === epoch.current) { setSavedIds(ids => [...new Set([...ids, id])]); celebrate(); } }
  async function generateQr() { const version = epoch.current; setBusy(true); setError(false); try { const result = await api<Handoff>("/api/visitor/handoff", "POST", {}); if (version !== epoch.current) return; setNow(Date.now()); setQr(result); setView("handoff_qr"); celebrate(); } catch { if (version === epoch.current) setError(true); } finally { if (version === epoch.current) setBusy(false); } }
  return <VoiceShell locale={locale} setLocale={value => { setLocale(value); if (active) void updatePreferences(value === "es" ? "Español" : "English").catch(() => setError(true)); }} kiosk><div className="kiosk-content" data-state={view}><AryChat key={`${sessionKey}-${active}`} locale={locale} active={active} online={online} disabled={busy || checking || ["finished", "transferred", "expired"].includes(view)} state={robotState} onActivity={setChatActivity} celebrating={celebrating} offlineImageAvailable={offlineImageAvailable} onStart={() => void start()} onPreferences={updatePreferences} savedIds={savedIds} onSave={save} canHandoff={authorized === true} onHandoff={() => void generateQr()} handoff={qr} now={now}
    initialMessage={view === "presence" ? uiText(locale, "hiIMAryTheDominicanParrot") : view === "transferred" ? t.transferred : view === "expired" ? t.expiredKiosk : view === "finished" ? t.finished : undefined}
    status={<div className="voice-status"><span className={`status ${online ? "connected" : "disconnected"}`} role="status">{checking ? uiText(locale, "checkingConnection") : online ? t.online : t.offline}</span><span data-testid="robot-status" data-gesture={robot.gesture} data-robot-state={robotState}>{robot.status === "ok" ? uiText(locale, "localBridgeAckReceived") : `${t.simulator} · ${gestureText[locale][robot.gesture]}${robot.status === "disconnected" ? uiText(locale, "robotDisconnected") : robot.status === "error" ? uiText(locale, "hardwareError") : ""}`}</span>{authorized !== null && <span>{authorized ? t.authorized : t.demoDevice}</span>}{error && <span role="alert">{t.serviceError}</span>}</div>}
    endControls={active && <>{remainingIdle <= 20 && <div className="idle-warning" role="alert"><strong>{uiText(locale, "stillThere")}</strong> {t.idleSoon} {remainingIdle} s. <button className="secondary" onClick={() => { lastActivity.current = Date.now(); setRemainingIdle(90); }}>{t.stay}</button></div>}<button className="text-button finish-chat" onClick={() => void finish()}>{t.finish}</button></>} /></div></VoiceShell>;
}
