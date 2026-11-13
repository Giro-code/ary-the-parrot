"use client";
import { uiText } from "../i18n/ui";
import { rememberLanguage } from "./locale-provider";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { Locale } from "../i18n";
import type { ChatReply } from "../server/ai/chat";
import type { ConversationPreferences } from "../conversation";
import type { RobotState } from "../robot/protocol";
import { api, ApiError } from "./api";
import { Icon } from "./icons";
import { AryStage } from "./ary-stage";
import { useAryVoice } from "./use-ary-voice";
import type { Saved } from "./types";
import { SourceCarousel } from "./source-carousel";
import { readMode, writeMode, type AryMode } from "./voice-turns";

type Message = { id: string; role: "user" | "assistant"; text: string; reply?: ChatReply };
export type ChatActivity = Extract<RobotState, "idle" | "listening" | "thinking" | "speaking" | "error">;
export type Handoff = { svg: string; expiresAt: string; confirmationCode: string };
type Props = {
  locale: Locale; active: boolean; online: boolean; disabled?: boolean; state?: RobotState; celebrating?: boolean; offlineImageAvailable?: boolean;
  playWelcome?: boolean;
  kiosk?: boolean;
  voiceRequested?: boolean; presenceGreeting?: boolean; onVoiceStart?: () => void;
  onActivity?: (state: ChatActivity) => void; onStart: () => void; onPreferences: (text: string, value?: ConversationPreferences) => Promise<void>;
  savedIds: string[]; savedItems?: Saved[]; onSave: (id: string) => Promise<void>; canHandoff?: boolean; onHandoff?: () => void; handoff?: Handoff | null; now?: number;
  status?: ReactNode; endControls?: ReactNode; initialMessage?: string;
};
function MicrophoneConsent({ en, automatic, accept, close }: { en: boolean; automatic: boolean; accept: () => void; close: () => void }) {
  const locale = en ? "en" : "es";
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="mic-consent" aria-labelledby="mic-consent-title" onCancel={close}>
    <h2 id="mic-consent-title">{uiText(locale, "shallWeTalk")}</h2>
    <p>{automatic ? en ? "The microphone is visible while listening, up to 15 seconds per turn. After Ary speaks, it opens again. Your voice goes to Google Gemini to understand and answer you. Ary does not store audio. Pause or type at any time." : "Verás el micrófono activo mientras escucha, hasta 15 segundos por turno. Después de hablar Ary, vuelve a abrirse. Tu voz se envía a Google Gemini para entenderte y responderte. Ary no guarda el audio. Puedes pausar o escribir cuando quieras." : uiText(locale, "onlyWhileYouPressRecordYourMicrophone")}</p>
    <p>{uiText(locale, "avoidNamesOrPersonalDetailsChildrenUse")} <a href="/privacidad" target="_blank" rel="noreferrer">{uiText(locale, "privacy")}</a></p>
    <div className="actions"><button onClick={accept} autoFocus>{uiText(locale, "iAgreeRecord")}</button><button className="secondary" onClick={close}>{uiText(locale, "useKeyboard")}</button></div>
  </dialog>;
}
export function AryChat(props: Props) {
  const { locale, active, online, disabled = false, onActivity, onPreferences, savedIds, onSave, handoff } = props;
  const en = locale === "en";
  const [messages, setMessages] = useState<Message[]>([]), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(active), [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false), [micAccepted, setMicAccepted] = useState(false);
  const [languageChosen, setLanguageChosen] = useState(false), [activity, setActivity] = useState<ChatActivity>("idle");
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);
  const pending = useRef<AbortController | null>(null), live = useRef(true), sending = useRef(false), tail = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const welcomePlayed = useRef(false);
  const [mode, setMode] = useState<AryMode>("voice"), [startedVoice, setStartedVoice] = useState(false), [paused, setPaused] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const startingVoice = useRef(false);
  const voiceStartEpoch = useRef(0);
  const lastReply = messages.findLast(row => row.reply)?.reply;
  function report(state: ChatActivity) { setActivity(state); onActivity?.(state); }
  async function receiveReply(reply: ChatReply) {
    if (reply.preferences) await onPreferences(reply.transcript || "", reply.preferences);
    if (!live.current) return;
    setMessages(rows => [...rows, ...(reply.transcript ? [{ id: crypto.randomUUID(), role: "user" as const, text: reply.transcript }] : []), { id: reply.messageId, role: "assistant", text: reply.displayText, reply }]);
    setLanguageChosen(true); setError(null); void voice.play(reply);
    if (reply.intent === "directions" && props.canHandoff && !handoff) { for (const source of reply.sources) await onSave(source.id); if (reply.destination && !reply.sources.length) await api("/api/trip-places", "POST", { name: reply.destination }); props.onHandoff?.(); }
  }
  const voice = useAryVoice({ enabled: active && online && !disabled && !handoff, onReply: receiveReply, onActivity: report });
  function changeMode(value: AryMode, persist = true) {
    startingVoice.current = false;
    voiceStartEpoch.current++;
    voice.cancel(); setStartedVoice(false); setPaused(false); setMode(value);
    if (value === "voice") voice.resetFailures();
    if (persist) { try { writeMode(localStorage, value); } catch { /* Storage unavailable. */ } }
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!props.kiosk) { try { setMode(readMode(localStorage)); } catch { /* Default to voice. */ } }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setMode("chat"); setFallback(en ? "Let's keep talking in writing. You can type below." : "Sigamos por escrito. Puedes escribir aquí abajo.");
      } else if (props.voiceRequested) setConsent(true);
    }, 0);
    return () => clearTimeout(timer);
    // Restore the visitor's choice once per session; kiosks always reset to voice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (mode === "voice" && (voice.notice === "permission" || voice.notice === "unsupported" || voice.ttsFailures >= 2)) {
      const timer = setTimeout(() => {
        welcomePlayed.current = true;
        changeMode("chat", false);
        setFallback(en ? "Let's keep talking in writing. You can type below." : "Sigamos por escrito. Puedes escribir aquí abajo.");
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.notice, voice.ttsFailures, mode]);
  async function beginVoice() {
    if (startingVoice.current || !active || !online || disabled || handoff) return;
    const epoch = ++voiceStartEpoch.current;
    startingVoice.current = true;
    try {
      if (!await voice.checkPermission()) return;
      if (epoch !== voiceStartEpoch.current) return;
      if (voice.muted) voice.toggleMute();
      voice.setAutomatic(true); setStartedVoice(true); setPaused(false); setFallback(null);
      // The welcome is already on screen for a fresh conversation: say it, don't create another one.
      const shown = messages.length === 1 && messages[0].role === "assistant" ? messages[0].reply : undefined;
      if (shown) { welcomePlayed.current = true; setError(null); void voice.play(shown); return; }
      report("thinking");
      const reply = await api<ChatReply>("/api/chat/cue", "POST", { cue: "welcome" }, AbortSignal.timeout(18000));
      if (!live.current || epoch !== voiceStartEpoch.current) return;
      welcomePlayed.current = true;
      await receiveReply(reply);
    } catch { if (live.current && epoch === voiceStartEpoch.current) { setError(uiText(locale, "pleaseTryThatAgain")); voice.cancel(); setStartedVoice(false); } }
    finally { if (epoch === voiceStartEpoch.current) startingVoice.current = false; }
  }
  function voiceAction() {
    if (!micAccepted) { voice.interrupt(); setConsent(true); return; }
    if (!startedVoice) { void beginVoice(); return; }
    if (startingVoice.current) { voiceStartEpoch.current++; startingVoice.current = false; }
    voice.setAutomatic(true); setPaused(false);
    if (voice.recording) voice.stopRecording(); else void voice.startRecording();
  }
  const textBlocked = busy || loading || disabled || !online || !!handoff || voice.processing;
  const blocked = textBlocked || voice.recording;
  useEffect(() => {
    if (active && mode === "chat" && !loading && !welcomePlayed.current && props.playWelcome !== false && lastReply) {
      welcomePlayed.current = true; void voice.play(lastReply);
    }
    // A restored chat keeps its existing mute behavior; voice mode requires the first touch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loading]);
  useEffect(() => {
    live.current = true;
    if (!active) return;
    let mounted = true;
    void api<{ messages: Message[] }>("/api/chat").then(async result => {
      if (!mounted) return;
      setMessages(result.messages);
      if (result.messages.length) { setLanguageChosen(result.messages.some(row => row.reply?.intent === "culture")); return; }
      const reply = await api<ChatReply>("/api/chat/cue", "POST", { cue: "welcome" });
      if (!mounted) return;
      setMessages([{ id: reply.messageId, role: "assistant", text: reply.displayText, reply }]);
      if (!welcomePlayed.current && props.playWelcome !== false && (mode === "chat" || props.presenceGreeting)) { welcomePlayed.current = true; void voice.play(reply); }
    }).catch(() => { if (mounted) setError(uiText(locale, "iCouldnTLoadOurChatYou")); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; live.current = false; pending.current?.abort(); };
    // This effect belongs to one mounted session. Language changes are explicit conversation actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    const conversation = tail.current?.parentElement;
    conversation?.scrollTo({ top: conversation.scrollHeight, behavior: "instant" });
  }, [messages, handoff, busy, error, languageChosen, voice.notice]);
  async function chooseLanguage(value: Locale) {
    if (blocked || sending.current) return;
    rememberLanguage(value);
    sending.current = true; setBusy(true); voice.interrupt();
    try {
      await onPreferences(value === "es" ? "Español" : "English");
      const reply = await api<ChatReply>("/api/chat/cue", "POST", { cue: "interests" });
      if (!live.current) return;
      setMessages(rows => [...rows, { id: crypto.randomUUID(), role: "user", text: value === "es" ? "Español" : "English" }, { id: reply.messageId, role: "assistant", text: reply.displayText, reply }]);
      setLanguageChosen(true); void voice.play(reply);
    } catch { setError(uiText(locale, "pleaseTryThatAgain")); }
    finally { sending.current = false; if (live.current) setBusy(false); }
  }
  async function ask(text: string) {
    const clean = text.trim(); if (!clean || clean.length > 500 || sending.current || textBlocked || (mode === "chat" && voice.recording)) return;
    if (voice.recording) { voice.cancel(); voice.setAutomatic(mode === "voice" && startedVoice && !paused); }
    sending.current = true; setBusy(true); setError(null); voice.interrupt(); report("thinking");
    try {
      await onPreferences(clean);
      pending.current = new AbortController();
      const reply = await api<ChatReply>("/api/chat", "POST", { message: clean }, AbortSignal.any([pending.current.signal, AbortSignal.timeout(18000)]));
      if (!live.current) return;
      setMessages(rows => [...rows, { id: crypto.randomUUID(), role: "user", text: clean }]);
      setMessage(""); report("idle"); await receiveReply(reply);
    } catch (error) {
      if (!live.current) return;
      setError(error instanceof ApiError && error.code === "email_verification_required" ? (en ? "You have used your 5 questions. Verify your email to continue. Open My conversations for help." : "Ya usaste tus 5 preguntas. Verifica tu correo para continuar. Abre Mis conversaciones para recibir ayuda.") : error instanceof ApiError && error.code === "rate_limited" ? uiText(locale, "messageLimitReachedWaitAMinuteUp") : error instanceof ApiError && error.code === "session_required" ? uiText(locale, "yourSessionExpiredStartAgain") : uiText(locale, "aryCouldNotReplyTryYourQuestion"));
      report("error");
    } finally { sending.current = false; if (live.current) setBusy(false); }
  }
  const state = !online ? "offline" : handoff ? "handoff_qr" : props.state || activity;
  const voiceNotice = voice.notice === "tts" ? uiText(locale, "iCanTSpeakRightNowSo") : voice.notice === "permission" ? uiText(locale, "microphoneAccessWasnTAllowedYouCan") : voice.notice === "unsupported" ? uiText(locale, "thisBrowserCanTRecordAudioLet") : voice.notice === "ask" ? uiText(locale, "iCouldnTUnderstandTheAudioPlease") : null;
  const latestUser = messages.findLast(row => row.role === "user"), latestAssistant = messages.findLast(row => row.role === "assistant");
  const visibleMessages = mode === "voice" ? messages.filter(row => row === latestUser || row === latestAssistant) : messages;
  const micLabel = voice.microphonePending ? en ? "Opening microphone…" : "Activando micrófono…" : !startedVoice ? en ? "Talk to Ary" : "Hablar con Ary" : voice.recording ? en ? "Listening…" : "Te escucho…" : activity === "thinking" ? en ? "Thinking…" : "Pensando…" : activity === "speaking" ? en ? "Ary is talking — tap to interrupt" : "Ary está hablando — toca para interrumpir" : en ? "Tap to talk" : "Toca para hablar";
  return <section className={`ary-chat voice-chat ${mode === "voice" ? "voice-first" : "text-mode"}`} data-mode={mode} aria-label={uiText(locale, "chatWithAry")}>
    <h1 className="sr-only">{uiText(locale, "chatWithAry")}</h1>
    <AryStage large={mode === "voice"} state={state} locale={locale} cards={lastReply?.sources.some(source => !!source.image)} celebrating={props.celebrating} offlineImageAvailable={props.offlineImageAvailable} />
    {props.status}
    <div className="conversation-scroll" tabIndex={0} aria-label={uiText(locale, "conversationScrollToPreviousMessages")}>
      <ol className="chat-messages" aria-label={uiText(locale, "conversation")} aria-live="polite" aria-relevant="additions">
        {!active && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><strong>Ary</strong><p>{props.initialMessage || (uiText(locale, "helloHelloIMAryLetS"))}</p><p className="muted">{uiText(locale, "noEmailNoAccountJustCuriosity")}</p></div></li>}
        {mode === "chat" && !!props.savedItems?.length && <li className="chat-message assistant"><div className="bubble"><p>{uiText(locale, "yourSavedPlacesCameAlong")}</p><SourceCarousel sources={props.savedItems.filter(({ item }) => item.sourceUrl).map(({ item }) => ({ id: item.id, title: item.title, summary: item.summary, url: item.sourceUrl!, editor: item.editor, image: item.image, mapsUrl: item.mapsUrl }))} locale={locale} kiosk={!!props.onHandoff} blocked={blocked} savedIds={savedIds} onSave={() => {}} onLocation={source => void ask(en ? `Where is ${source.title}?` : `¿Dónde queda ${source.title}?`)} /></div></li>}
        {visibleMessages.map(row => <li key={row.id} className={`chat-message ${row.role}`}>
          {row.role === "assistant" && <span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span>}
          <div className="bubble"><strong>{row.role === "user" ? uiText(locale, "you") : "Ary"}</strong><p>{row.text}</p>
            {row.reply?.intent === "general" && row.reply.mode === "gemini" && <p className="reply-mode">{en ? "General AI answer" : "Respuesta general de IA"}</p>}
            {row.reply?.intent === "directions" && row.reply.destination && !row.reply.sources.length && !props.onHandoff && <button className="secondary" disabled={blocked || savedPlaces.includes(row.reply.destination)} onClick={() => { const name = row.reply!.destination!; void api("/api/trip-places", "POST", { name }).then(() => setSavedPlaces(rows => [...rows, name])).catch(() => setError(uiText(locale, "iCouldnTSaveItPleaseTry"))); }}>{savedPlaces.includes(row.reply.destination) ? uiText(locale, "saved") : en ? "Save to My culture" : "Guardar en Mi cultura"}</button>}
            {row.reply?.intent === "culture" && <p className="reply-mode">{row.reply.mode === "gemini" ? uiText(locale, "aiOnlineGemini") : uiText(locale, "exampleResponses")}</p>}
            {!!row.reply?.sources.length && <SourceCarousel first={row.id === lastReply?.messageId} sources={row.reply.sources} locale={locale} kiosk={!!props.onHandoff} directions={row.reply.intent === "directions"} blocked={blocked} savedIds={savedIds} onSave={id => { void onSave(id).catch(() => setError(uiText(locale, "iCouldnTSaveItPleaseTry"))); }} onLocation={source => void ask(en ? `Where is ${source.title}?` : `¿Dónde queda ${source.title}?`)} />}
          </div>
        </li>)}
        {active && !loading && <li className="chat-quick-replies">{!languageChosen ? <><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("es")} lang="es">Español</button><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("en")} lang="en">English</button></> : <>{(lastReply?.followUps.length ? lastReply.followUps : en ? ["Music", "Food", "Beaches", "History"] : ["Música", "Comida", "Playas", "Historia"]).slice(0, 4).map(text => <button className="secondary" key={text} disabled={mode === "voice" ? textBlocked : blocked} onClick={() => void ask(text)}>{text}</button>)}</>}</li>}
        {active && props.onHandoff && (savedIds.length > 0 || messages.filter(row => row.role === "user").length >= 2) && !handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><p>{uiText(locale, "wantToTakeThisWithYouOn")}</p><button className="secondary" disabled={blocked || !props.canHandoff} onClick={props.onHandoff}>{uiText(locale, "continueOnMyPhone")}</button>{!props.canHandoff && <p className="muted">{uiText(locale, "theOperatorNeedsToActivateThisKiosk")}</p>}</div></li>}
        {handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble inline-handoff"><h2>{uiText(locale, "takeTheExperienceWithYou")}</h2><p>{en ? "Take this to your phone to continue the same conversation. Scan and check the two digits." : "Te paso esto a tu teléfono para que sigas la conversación y llegues fácil. Escanea y comprueba los dos dígitos."}</p><Image src={`data:image/svg+xml,${encodeURIComponent(handoff.svg)}`} alt={uiText(locale, "privateHandoffQr")} width={220} height={220} unoptimized className="qr-image" /><p>{uiText(locale, "confirmationCode")} <strong className="confirmation-code">{handoff.confirmationCode}</strong></p><p>{uiText(locale, "expiresIn")} {Math.max(0, Math.ceil((Date.parse(handoff.expiresAt) - (props.now || 0)) / 1000))} s</p><p className="muted">{en ? "Private and single-use. Your conversation and saved places travel with you. On your phone, share your email before continuing." : "Privado y de un solo uso. Tu conversación y lugares guardados viajan contigo. En tu teléfono te pediremos el correo para continuar."}</p></div></li>}
      </ol>
      {(busy || loading || voice.processing) && <p className="chat-wait" role="status">{loading ? uiText(locale, "openingOurChat") : uiText(locale, "aryIsThinking")}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {fallback && <p className="voice-notice" role="status">{fallback}</p>}
      {voiceNotice && <p className="voice-notice" role="status">{voiceNotice} <button className="text-button" onClick={() => { flushSync(() => changeMode("chat")); input.current?.focus(); }}>{uiText(locale, "useKeyboard")}</button></p>}
      <div ref={tail} />
    </div>
    <div className="voice-composer">
      {mode === "voice" ? <>
        <div className="voice-dock">
          <button className="voice-side-button" aria-label={en ? "Type instead" : "Escribir"} title={en ? "Type instead" : "Escribir"} onClick={() => changeMode("chat")}><Icon kind="keyboard"/></button>
          <button className={`voice-main-mic ${voice.recording || voice.microphonePending ? "is-recording" : ""}`} disabled={disabled || !online || loading || busy || voice.processing || voice.microphonePending || !!handoff} aria-label={micLabel} aria-pressed={voice.recording} onClick={() => { if (!active) (props.onVoiceStart || props.onStart)(); else voiceAction(); }}><Icon kind={voice.recording ? "stop" : "mic"}/></button>
          {startedVoice ? <button className="voice-side-button" aria-label={paused ? (en ? "Resume conversation" : "Reanudar conversación") : (en ? "Pause conversation" : "Pausar conversación")} title={paused ? (en ? "Resume" : "Reanudar") : (en ? "Pause" : "Pausar")} aria-pressed={paused} onClick={() => { if (paused) { voiceAction(); return; } voiceStartEpoch.current++; startingVoice.current = false; voice.cancel(); setPaused(true); }}><Icon kind={paused ? "play" : "pause"}/></button> : <span className="voice-side-button is-placeholder" aria-hidden="true"/>}
        </div>
        <p className="voice-main-label" role="status">{paused ? (en ? "Paused" : "En pausa") : micLabel}{voice.recording && ` · ${voice.seconds}/15 s`}</p>
        {voice.recording && <div className="voice-meter" aria-hidden="true">{[.6, .9, 1, .8, .5].map((scale, index) => <span key={index} style={{ transform: `scaleY(${.15 + voice.level * scale})` }} />)}</div>}
      </> : !active ? <button className="start-chat" disabled={disabled || !online} onClick={props.onStart}>{uiText(locale, "start")} <Icon kind="conversations"/></button> : <>
        <button className="text-button return-to-voice" aria-label={en ? "Voice mode: Talk to Ary" : "Modo Voz: Hablar con Ary"} onClick={() => changeMode("voice")}>{en ? "Talk to Ary" : "Hablar con Ary"}</button>
        <div className="compact-composer">
          <button className={`microphone ${voice.recording ? "is-recording" : ""}`} disabled={(!voice.recording && blocked) || !online} aria-label={voice.recording ? uiText(locale, "stopRecording") : uiText(locale, "speakToAry")} aria-pressed={voice.recording} onClick={() => { if (voice.recording) voice.stopRecording(); else if (micAccepted) void voice.startRecording(); else { voice.interrupt(); setConsent(true); } }}><Icon kind={voice.recording ? "stop" : "mic"}/></button>
          <form className="text-composer" onSubmit={event => { event.preventDefault(); void ask(message); }}><label className="sr-only" htmlFor="ary-message">{uiText(locale, "yourCulturalQuestion")}</label><input ref={input} id="ary-message" maxLength={500} value={message} disabled={blocked} onChange={event => setMessage(event.target.value)} placeholder={uiText(locale, "writeToAry")}/><button type="submit" disabled={blocked || !message.trim()} aria-label={uiText(locale, "sendQuestion")}><Icon kind="send"/></button></form>
          <button className="secondary icon-button" aria-label={voice.muted ? uiText(locale, "enableArySVoice") : uiText(locale, "muteArySVoice")} aria-pressed={voice.muted} onClick={() => { voice.toggleMute(); if (voice.muted && !voice.recording && !voice.processing && lastReply) void voice.play(lastReply); }}><Icon kind={voice.muted ? "mute" : "sound"}/></button>
        </div>
        {voice.recording && <p className="recording-status" role="status">
          {uiText(locale, "microphoneActive")} · {voice.seconds}/15 s{" "}
          <button type="button" className="text-button" onClick={() => {
            // Enable the composer before transferring focus from the recording control.
            flushSync(() => voice.cancel());
            input.current?.focus();
          }}>{uiText(locale, "useKeyboard")}</button>
        </p>}
        {voice.recording && <div className="voice-meter" aria-hidden="true">{[.6, .9, 1, .8, .5].map((scale, index) => <span key={index} style={{ transform: `scaleY(${.15 + voice.level * scale})` }} />)}</div>}
      </>}
      {mode !== "voice" && <details className="voice-privacy"><summary>{en ? "Voice and privacy" : "Voz y privacidad"}</summary><p>{uiText(locale, "voiceGoesToGoogleAiAryDoes")} <a href={`/privacidad?lang=${locale}`} target="_blank" rel="noreferrer">{uiText(locale, "privacy")}</a></p></details>}
      {props.endControls}
    </div>
    <audio ref={node => { voice.bindAudio(node); }} onPlay={() => voice.activity("speaking")} onEnded={() => voice.ended()} onPause={() => { if (!voice.recording && !voice.processing) voice.activity("idle"); }} onError={voice.playbackFailed} />
    {consent && <MicrophoneConsent en={en} automatic={mode === "voice"} accept={() => { setConsent(false); setMicAccepted(true); if (mode === "voice") void beginVoice(); else void voice.startRecording(); }} close={() => { flushSync(() => { setConsent(false); changeMode("chat"); }); input.current?.focus(); }} />}
  </section>;
}
