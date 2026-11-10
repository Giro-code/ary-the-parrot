"use client";
import { uiText } from "../i18n/ui";
import { rememberLanguage } from "./locale-provider";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "../i18n";
import type { ChatReply } from "../server/ai/chat";
import type { ConversationPreferences } from "../conversation";
import type { RobotState } from "../robot/protocol";
import { api, ApiError } from "./api";
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
function Icon({ kind }: { kind: "mic" | "keyboard" | "sound" | "mute" | "stop" | "send" }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === "mic" ? <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></> : kind === "keyboard" ? <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" /></> : kind === "stop" ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /> : kind === "send" ? <path d="m4 4 17 8-17 8 4-8-4-8Zm4 8h13" /> : <><path d="m11 4-6 5H2v6h3l6 5V4Z" />{kind === "mute" ? <path d="m16 9 6 6m0-6-6 6" /> : <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />}</>}</svg>;
}
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
  const [keyboard, setKeyboard] = useState(false), [consent, setConsent] = useState(false), [micAccepted, setMicAccepted] = useState(false);
  const [languageChosen, setLanguageChosen] = useState(false), [activity, setActivity] = useState<ChatActivity>("idle");
  const pending = useRef<AbortController | null>(null), live = useRef(true), sending = useRef(false), tail = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const welcomePlayed = useRef(false);
  const lastReply = messages.findLast(row => row.reply)?.reply;
  function report(state: ChatActivity) { setActivity(state); onActivity?.(state); }
  async function receiveReply(reply: ChatReply) {
    if (reply.preferences) await onPreferences(reply.transcript || "", reply.preferences);
    if (!live.current) return;
    setMessages(rows => [...rows, ...(reply.transcript ? [{ id: crypto.randomUUID(), role: "user" as const, text: reply.transcript }] : []), { id: reply.messageId, role: "assistant", text: reply.displayText, reply }]);
    setLanguageChosen(true); setError(null); void voice.play(reply);
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
  useEffect(() => { if (keyboard) input.current?.focus(); }, [keyboard]);
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
      setError(error instanceof ApiError && error.code === "rate_limited" ? uiText(locale, "messageLimitReachedWaitAMinuteUp") : error instanceof ApiError && error.code === "session_required" ? uiText(locale, "yourSessionExpiredStartAgain") : uiText(locale, "aryCouldNotReplyTryYourQuestion"));
      report("error");
    } finally { sending.current = false; if (live.current) setBusy(false); }
  }
  const state = !online ? "offline" : props.state || activity;
  const voiceNotice = voice.notice === "tts" ? uiText(locale, "iCanTSpeakRightNowSo") : voice.notice === "permission" ? uiText(locale, "microphoneAccessWasnTAllowedYouCan") : voice.notice === "unsupported" ? uiText(locale, "thisBrowserCanTRecordAudioLet") : voice.notice === "ask" ? uiText(locale, "iCouldnTUnderstandTheAudioPlease") : null;
  return <section className="ary-chat voice-chat" aria-label={uiText(locale, "chatWithAry")}>
    <AryStage state={state} locale={locale} cards={!!lastReply?.sources.length} celebrating={props.celebrating} offlineImageAvailable={props.offlineImageAvailable} />
    {props.status}
    <div className="conversation-scroll" tabIndex={0} aria-label={uiText(locale, "conversationScrollToPreviousMessages")}>
      <ol className="chat-messages" aria-label={uiText(locale, "conversation")} aria-live="polite" aria-relevant="additions">
        {!active && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><strong>Ary</strong><p>{props.initialMessage || (uiText(locale, "helloHelloIMAryLetS"))}</p><p className="muted">{uiText(locale, "noEmailNoAccountJustCuriosity")}</p></div></li>}
        {!!props.savedItems?.length && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><p>{uiText(locale, "yourSavedPlacesCameAlong")}</p><div className="inline-cards">{props.savedItems.map(({ item }) => <article key={item.id} className="chat-card"><h2>{item.title}</h2><p>{item.summary}</p>{item.sourceUrl && <a className="card-source" href={item.sourceUrl} target="_blank" rel="noreferrer">{uiText(locale, "source")} · {item.editor}</a>}<div className="card-actions"><span>{uiText(locale, "saved")}</span><a href={`/cultura/${item.id}`} target="_blank" rel="noreferrer">{uiText(locale, "open")} ↗</a></div></article>)}</div></div></li>}
        {messages.map(row => <li key={row.id} className={`chat-message ${row.role}`}>
          {row.role === "assistant" && <span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span>}
          <div className="bubble"><strong>{row.role === "user" ? uiText(locale, "you") : "Ary"}</strong><p>{row.text}</p>
            {row.reply?.intent === "culture" && <p className="reply-mode">{row.reply.mode === "gemini" ? uiText(locale, "aiOnlineGemini") : uiText(locale, "exampleResponses")}</p>}
            {!!row.reply?.sources.length && <div className="inline-cards">{row.reply.sources.map(source => <article className="chat-card" key={source.id}><h2>{source.title}</h2><p>{source.summary}</p><a className="card-source" href={source.url} target="_blank" rel="noreferrer">{uiText(locale, "source")} · {source.editor}</a><div className="card-actions"><button className="secondary" disabled={blocked || savedIds.includes(source.id)} onClick={() => { void onSave(source.id).catch(() => setError(uiText(locale, "iCouldnTSaveItPleaseTry"))); }}>{savedIds.includes(source.id) ? uiText(locale, "saved") : uiText(locale, "save")}</button><a href={`/cultura/${source.id}`} target="_blank" rel="noreferrer">{uiText(locale, "open")} <span aria-hidden="true">↗</span></a></div></article>)}</div>}
          </div>
        </li>)}
        {active && !loading && <li className="chat-quick-replies">{!languageChosen ? <><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("es")} lang="es">Español</button><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("en")} lang="en">English</button></> : <>{(lastReply?.followUps.length ? lastReply.followUps : en ? ["Music", "Food", "Beaches", "History"] : ["Música", "Comida", "Playas", "Historia"]).slice(0, 4).map(text => <button className="secondary" key={text} disabled={blocked} onClick={() => void ask(text)}>{text}</button>)}</>}</li>}
        {active && props.onHandoff && (savedIds.length > 0 || messages.filter(row => row.role === "user").length >= 2) && !handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><p>{uiText(locale, "wantToTakeThisWithYouOn")}</p><button className="secondary" disabled={blocked || !props.canHandoff} onClick={props.onHandoff}>{uiText(locale, "continueOnMyPhone")}</button>{!props.canHandoff && <p className="muted">{uiText(locale, "theOperatorNeedsToActivateThisKiosk")}</p>}</div></li>}
        {handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble inline-handoff"><h2>{uiText(locale, "takeTheExperienceWithYou")}</h2><p>{uiText(locale, "scanWithYourPhoneAndCheckThe")}</p><Image src={`data:image/svg+xml,${encodeURIComponent(handoff.svg)}`} alt={uiText(locale, "privateHandoffQr")} width={220} height={220} unoptimized className="qr-image" /><p>{uiText(locale, "confirmationCode")} <strong className="confirmation-code">{handoff.confirmationCode}</strong></p><p>{uiText(locale, "expiresIn")} {Math.max(0, Math.ceil((Date.parse(handoff.expiresAt) - (props.now || 0)) / 1000))} s</p><p className="muted">{uiText(locale, "privateSingleUseOnlyLanguageInterestsAnd")}</p></div></li>}
      </ol>
      {(busy || loading || voice.processing) && <p className="chat-wait" role="status">{loading ? uiText(locale, "openingOurChat") : uiText(locale, "aryIsThinking")}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {voiceNotice && <p className="voice-notice" role="status">{voiceNotice} <button className="text-button" onClick={() => setKeyboard(true)}>{uiText(locale, "useKeyboard")}</button></p>}
      <div ref={tail} />
    </div>
    <div className="voice-composer">
      {!active ? <button className="start-chat" disabled={disabled || !online} onClick={props.onStart}>{uiText(locale, "start")} <span aria-hidden="true">→</span></button> : <>
        {keyboard && <form className="text-composer" onSubmit={event => { event.preventDefault(); void ask(message); }}><label className="sr-only" htmlFor="ary-message">{uiText(locale, "yourCulturalQuestion")}</label><input ref={input} id="ary-message" maxLength={500} value={message} disabled={blocked} onChange={event => setMessage(event.target.value)} placeholder={uiText(locale, "writeToAry")} /><button type="submit" disabled={blocked || !message.trim()} aria-label={uiText(locale, "sendQuestion")}><Icon kind="send" /></button></form>}
        <div className="voice-controls"><button className="secondary icon-button" aria-label={uiText(locale, "useKeyboard")} aria-pressed={keyboard} onClick={() => { voice.cancel(); setKeyboard(value => !value); }}><Icon kind="keyboard" /></button><div className="mic-action"><button className={`microphone ${voice.recording ? "is-recording" : ""}`} disabled={(!voice.recording && blocked) || !online} aria-label={voice.recording ? uiText(locale, "stopRecording") : uiText(locale, "speakToAry")} aria-pressed={voice.recording} aria-describedby="mic-help" onClick={() => { if (voice.recording) voice.stopRecording(); else if (micAccepted) void voice.startRecording(); else { voice.interrupt(); setConsent(true); } }}><Icon kind={voice.recording ? "stop" : "mic"} /></button><span id="mic-help">{voice.recording ? `${uiText(locale, "microphoneActive")} · ${voice.seconds}/15 s` : uiText(locale, "tapToTalk")}</span></div><button className="secondary icon-button" aria-label={voice.muted ? uiText(locale, "enableArySVoice") : uiText(locale, "muteArySVoice")} aria-pressed={voice.muted} onClick={() => { voice.toggleMute(); if (voice.muted && !voice.recording && !voice.processing && lastReply) void voice.play(lastReply); }}><Icon kind={voice.muted ? "mute" : "sound"} /></button></div>
        {voice.recording && <div className="voice-meter" aria-hidden="true">{[.6, .9, 1, .8, .5].map((scale, index) => <span key={index} style={{ transform: `scaleY(${.15 + voice.level * scale})` }} />)}</div>}
      </>}
      <p className="voice-privacy">{uiText(locale, "voiceGoesToGoogleAiAryDoes")} <a href="/privacidad" target="_blank" rel="noreferrer">{uiText(locale, "privacy")}</a></p>
      {props.endControls}
    </div>
    <audio ref={node => { voice.bindAudio(node); }} onPlay={() => voice.activity("speaking")} onEnded={() => voice.activity("idle")} onPause={() => voice.activity("idle")} onError={voice.playbackFailed} />
    {consent && <MicrophoneConsent en={en} accept={() => { setConsent(false); setMicAccepted(true); void voice.startRecording(); }} close={() => { setConsent(false); setKeyboard(true); }} />}
  </section>;
}
