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

type Message = { id: string; role: "user" | "assistant"; text: string; reply?: ChatReply };
export type ChatActivity = Extract<RobotState, "idle" | "listening" | "thinking" | "speaking" | "error">;
export type Handoff = { svg: string; expiresAt: string; confirmationCode: string };
type Props = {
  locale: Locale; active: boolean; online: boolean; disabled?: boolean; state?: RobotState; celebrating?: boolean; offlineImageAvailable?: boolean;
  playWelcome?: boolean;
  onActivity?: (state: ChatActivity) => void; onStart: () => void; onPreferences: (text: string, value?: ConversationPreferences) => Promise<void>;
  savedIds: string[]; savedItems?: Saved[]; onSave: (id: string) => Promise<void>; canHandoff?: boolean; onHandoff?: () => void; handoff?: Handoff | null; now?: number;
  status?: ReactNode; endControls?: ReactNode; initialMessage?: string;
};
function MicrophoneConsent({ en, accept, close }: { en: boolean; accept: () => void; close: () => void }) {
  const locale = en ? "en" : "es";
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="mic-consent" aria-labelledby="mic-consent-title" onCancel={close}>
    <h2 id="mic-consent-title">{uiText(locale, "shallWeTalk")}</h2>
    <p>{uiText(locale, "onlyWhileYouPressRecordYourMicrophone")}</p>
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
  const blocked = busy || loading || disabled || !online || !!handoff || voice.processing || voice.recording;
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
      if (!welcomePlayed.current && props.playWelcome !== false) { welcomePlayed.current = true; void voice.play(reply); }
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
    const clean = text.trim(); if (!clean || clean.length > 500 || sending.current || blocked) return;
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
  return <section className="ary-chat voice-chat" aria-label={uiText(locale, "chatWithAry")}>
    <h1 className="sr-only">{uiText(locale, "chatWithAry")}</h1>
    <AryStage state={state} locale={locale} cards={!!lastReply?.sources.length} celebrating={props.celebrating} offlineImageAvailable={props.offlineImageAvailable} />
    {props.status}
    <div className="conversation-scroll" tabIndex={0} aria-label={uiText(locale, "conversationScrollToPreviousMessages")}>
      <ol className="chat-messages" aria-label={uiText(locale, "conversation")} aria-live="polite" aria-relevant="additions">
        {!active && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><strong>Ary</strong><p>{props.initialMessage || (uiText(locale, "helloHelloIMAryLetS"))}</p><p className="muted">{uiText(locale, "noEmailNoAccountJustCuriosity")}</p></div></li>}
        {!!props.savedItems?.length && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><p>{uiText(locale, "yourSavedPlacesCameAlong")}</p><div className="inline-cards">{props.savedItems.map(({ item }) => <article key={item.id} className="chat-card"><h2>{item.title}</h2><p>{item.summary}</p>{item.sourceUrl && <a className="card-source" href={item.sourceUrl} target="_blank" rel="noreferrer">{uiText(locale, "source")} · {item.editor}</a>}<div className="card-actions"><span>{uiText(locale, "saved")}</span><a href={`/cultura/${item.id}`} target="_blank" rel="noreferrer">{uiText(locale, "open")} <Icon kind="open"/></a></div></article>)}</div></div></li>}
        {messages.map(row => <li key={row.id} className={`chat-message ${row.role}`}>
          {row.role === "assistant" && <span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span>}
          <div className="bubble"><strong>{row.role === "user" ? uiText(locale, "you") : "Ary"}</strong><p>{row.text}</p>
            {row.reply?.intent === "general" && row.reply.mode === "gemini" && <p className="reply-mode">{en ? "General AI answer" : "Respuesta general de IA"}</p>}
            {row.reply?.intent === "directions" && row.reply.destination && !row.reply.sources.length && !props.onHandoff && <button className="secondary" disabled={blocked || savedPlaces.includes(row.reply.destination)} onClick={() => { const name = row.reply!.destination!; void api("/api/trip-places", "POST", { name }).then(() => setSavedPlaces(rows => [...rows, name])).catch(() => setError(uiText(locale, "iCouldnTSaveItPleaseTry"))); }}>{savedPlaces.includes(row.reply.destination) ? uiText(locale, "saved") : en ? "Save in My trips" : "Guardar en Mis viajes"}</button>}
            {row.reply?.intent === "culture" && <p className="reply-mode">{row.reply.mode === "gemini" ? uiText(locale, "aiOnlineGemini") : uiText(locale, "exampleResponses")}</p>}
            {!!row.reply?.sources.length && <div className="inline-cards">{row.reply.sources.map(source => <article className="chat-card" key={source.id}><h2>{source.title}</h2><p>{source.summary}</p>{source.location && <p className="record-location">{en ? "Location from the source: " : "Ubicación de la ficha: "}{source.location}</p>}<a className="card-source" href={source.url} target="_blank" rel="noreferrer">{uiText(locale, "source")} · {source.editor}</a><div className="card-actions"><button className="secondary" disabled={blocked || savedIds.includes(source.id)} onClick={() => { void onSave(source.id).catch(() => setError(uiText(locale, "iCouldnTSaveItPleaseTry"))); }}><Icon kind="save"/>{savedIds.includes(source.id) ? uiText(locale, "saved") : row.reply?.intent === "directions" ? (en ? "Save in My trips" : "Guardar en Mis viajes") : uiText(locale, "save")}</button><a href={`/cultura/${source.id}`} target="_blank" rel="noreferrer">{uiText(locale, "open")} <Icon kind="open"/></a></div></article>)}</div>}
          </div>
        </li>)}
        {active && !loading && <li className="chat-quick-replies">{!languageChosen ? <><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("es")} lang="es">Español</button><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("en")} lang="en">English</button></> : <>{(lastReply?.followUps.length ? lastReply.followUps : en ? ["Music", "Food", "Beaches", "History"] : ["Música", "Comida", "Playas", "Historia"]).slice(0, 4).map(text => <button className="secondary" key={text} disabled={blocked} onClick={() => void ask(text)}>{text}</button>)}</>}</li>}
        {active && props.onHandoff && (savedIds.length > 0 || messages.filter(row => row.role === "user").length >= 2) && !handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><p>{uiText(locale, "wantToTakeThisWithYouOn")}</p><button className="secondary" disabled={blocked || !props.canHandoff} onClick={props.onHandoff}>{uiText(locale, "continueOnMyPhone")}</button>{!props.canHandoff && <p className="muted">{uiText(locale, "theOperatorNeedsToActivateThisKiosk")}</p>}</div></li>}
        {handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble inline-handoff"><h2>{uiText(locale, "takeTheExperienceWithYou")}</h2><p>{en ? "Take this to your phone to continue the same conversation. Scan and check the two digits." : "Te paso esto a tu teléfono para que sigas la conversación y llegues fácil. Escanea y comprueba los dos dígitos."}</p><Image src={`data:image/svg+xml,${encodeURIComponent(handoff.svg)}`} alt={uiText(locale, "privateHandoffQr")} width={220} height={220} unoptimized className="qr-image" /><p>{uiText(locale, "confirmationCode")} <strong className="confirmation-code">{handoff.confirmationCode}</strong></p><p>{uiText(locale, "expiresIn")} {Math.max(0, Math.ceil((Date.parse(handoff.expiresAt) - (props.now || 0)) / 1000))} s</p><p className="muted">{en ? "Private and single-use. Your conversation and saved places travel with you. On your phone, share your email before continuing." : "Privado y de un solo uso. Tu conversación y lugares guardados viajan contigo. En tu teléfono te pediremos el correo para continuar."}</p></div></li>}
      </ol>
      {(busy || loading || voice.processing) && <p className="chat-wait" role="status">{loading ? uiText(locale, "openingOurChat") : uiText(locale, "aryIsThinking")}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {voiceNotice && <p className="voice-notice" role="status">{voiceNotice} <button className="text-button" onClick={() => input.current?.focus()}>{uiText(locale, "useKeyboard")}</button></p>}
      <div ref={tail} />
    </div>
    <div className="voice-composer">
      {!active ? <button className="start-chat" disabled={disabled || !online} onClick={props.onStart}>{uiText(locale, "start")} <Icon kind="conversations"/></button> : <>
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
      <details className="voice-privacy"><summary>{en ? "Voice and privacy" : "Voz y privacidad"}</summary><p>{uiText(locale, "voiceGoesToGoogleAiAryDoes")} <a href={`/privacidad?lang=${locale}`} target="_blank" rel="noreferrer">{uiText(locale, "privacy")}</a></p></details>
      {props.endControls}
    </div>
    <audio ref={node => { voice.bindAudio(node); }} onPlay={() => voice.activity("speaking")} onEnded={() => { if (!voice.recording && !voice.processing) voice.activity("idle"); }} onPause={() => { if (!voice.recording && !voice.processing) voice.activity("idle"); }} onError={voice.playbackFailed} />
    {consent && <MicrophoneConsent en={en} accept={() => { setConsent(false); setMicAccepted(true); void voice.startRecording(); }} close={() => { setConsent(false); input.current?.focus(); }} />}
  </section>;
}
