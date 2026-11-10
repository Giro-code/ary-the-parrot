"use client";
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
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="mic-consent" aria-labelledby="mic-consent-title" onCancel={close}>
    <h2 id="mic-consent-title">{en ? "Shall we talk?" : "¿Conversamos?"}</h2>
    <p>{en ? "Only while you press Record, your microphone captures up to 15 seconds. Your voice is sent to Google Gemini to understand and answer you. Ary does not store your audio." : "Solo al pulsar Grabar, el micrófono recoge hasta 15 segundos. Tu voz se envía a Google Gemini para entenderte y responderte. Ary no guarda tu audio."}</p>
    <p>{en ? "Avoid names or personal details. Children: use the keyboard or ask an accompanying adult. You can always type instead." : "Evita nombres y datos personales. Si eres menor, usa el teclado o pide ayuda a la persona adulta que te acompaña. Siempre puedes escribir."} <a href="/privacidad" target="_blank" rel="noreferrer">{en ? "Privacy" : "Privacidad"}</a></p>
    <div className="actions"><button onClick={accept} autoFocus>{en ? "I agree · Record" : "Acepto · Grabar"}</button><button className="secondary" onClick={close}>{en ? "Use keyboard" : "Usar teclado"}</button></div>
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
    if (reply.transcript) await onPreferences(reply.transcript, reply.preferences);
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
    }).catch(() => { if (mounted) setError(en ? "I couldn't load our chat. You can try a question." : "No pude cargar nuestra charla. Puedes probar con una pregunta."); }).finally(() => { if (mounted) setLoading(false); });
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
    sending.current = true; setBusy(true); voice.interrupt();
    try {
      await onPreferences(value === "es" ? "Español" : "English");
      const reply = await api<ChatReply>("/api/chat/cue", "POST", { cue: "interests" });
      if (!live.current) return;
      setMessages(rows => [...rows, { id: crypto.randomUUID(), role: "user", text: value === "es" ? "Español" : "English" }, { id: reply.messageId, role: "assistant", text: reply.displayText, reply }]);
      setLanguageChosen(true); void voice.play(reply);
    } catch { setError(en ? "Please try that again." : "Prueba otra vez, por favor."); }
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
      setError(error instanceof ApiError && error.code === "rate_limited" ? en ? "Message limit reached. Wait a minute. Up to 20 questions per session." : "Límite de mensajes alcanzado. Espera un minuto. Hasta 20 preguntas por sesión." : error instanceof ApiError && error.code === "session_required" ? en ? "Your session expired. Start again." : "Tu sesión caducó. Vuelve a empezar." : en ? "Ary could not reply. Try your question again." : "Ary no pudo responder. Vuelve a enviar tu pregunta.");
      report("error");
    } finally { sending.current = false; if (live.current) setBusy(false); }
  }
  const state = !online ? "offline" : props.state || activity;
  const voiceNotice = voice.notice === "tts" ? en ? "I can't speak right now, so I'll write it for you." : "Ahora no puedo hablar, te lo escribo." : voice.notice === "permission" ? en ? "Microphone access wasn't allowed. You can use the keyboard." : "No se permitió el micrófono. Puedes usar el teclado." : voice.notice === "unsupported" ? en ? "This browser can't record audio. Let's use the keyboard." : "Este navegador no puede grabar audio. Usemos el teclado." : voice.notice === "ask" ? en ? "I couldn't understand the audio. Please try again or type." : "No pude entender el audio. Prueba otra vez o escribe." : null;
  return <section className="ary-chat voice-chat" aria-label={en ? "Chat with Ary" : "Chat con Ary"}>
    <AryStage state={state} locale={locale} cards={!!lastReply?.sources.length} celebrating={props.celebrating} offlineImageAvailable={props.offlineImageAvailable} />
    {props.status}
    <div className="conversation-scroll" tabIndex={0} aria-label={en ? "Conversation, scroll to previous messages" : "Conversación, desplázate para ver mensajes anteriores"}>
      <ol className="chat-messages" aria-label={en ? "Conversation" : "Conversación"} aria-live="polite" aria-relevant="additions">
        {!active && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><strong>Ary</strong><p>{props.initialMessage || (en ? "Hello, hello! I'm Ary. Let's discover the Dominican Republic together." : "¡Hola, hola! Soy Ary. Vamos a descubrir República Dominicana juntos.")}</p><p className="muted">{en ? "No email. No account. Just curiosity." : "Sin correo ni cuenta. Solo curiosidad."}</p></div></li>}
        {!!props.savedItems?.length && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><p>{en ? "Your saved places came along!" : "¡Tus guardados vinieron contigo!"}</p><div className="inline-cards">{props.savedItems.map(({ item }) => <article key={item.id} className="chat-card"><h2>{item.title}</h2><p>{item.summary}</p>{item.sourceUrl && <a className="card-source" href={item.sourceUrl} target="_blank" rel="noreferrer">{en ? "Source" : "Fuente"} · {item.editor}</a>}<div className="card-actions"><span>{en ? "Saved" : "Guardado"}</span><a href={`/cultura/${item.id}`} target="_blank" rel="noreferrer">{en ? "Open" : "Abrir"} ↗</a></div></article>)}</div></div></li>}
        {messages.map(row => <li key={row.id} className={`chat-message ${row.role}`}>
          {row.role === "assistant" && <span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span>}
          <div className="bubble"><strong>{row.role === "user" ? en ? "You" : "Tú" : "Ary"}</strong><p>{row.text}</p>
            {row.reply?.intent === "culture" && <p className="reply-mode">{row.reply.mode === "gemini" ? en ? "AI online · Gemini" : "IA en línea · Gemini" : en ? "Example responses" : "Respuestas de ejemplo"}</p>}
            {!!row.reply?.sources.length && <div className="inline-cards">{row.reply.sources.map(source => <article className="chat-card" key={source.id}><h2>{source.title}</h2><p>{source.summary}</p><a className="card-source" href={source.url} target="_blank" rel="noreferrer">{en ? "Source" : "Fuente"} · {source.editor}</a><div className="card-actions"><button className="secondary" disabled={blocked || savedIds.includes(source.id)} onClick={() => { void onSave(source.id).catch(() => setError(en ? "I couldn't save it. Please try again." : "No pude guardarlo. Prueba otra vez.")); }}>{savedIds.includes(source.id) ? en ? "Saved" : "Guardado" : en ? "Save" : "Guardar"}</button><a href={`/cultura/${source.id}`} target="_blank" rel="noreferrer">{en ? "Open" : "Abrir"} <span aria-hidden="true">↗</span></a></div></article>)}</div>}
          </div>
        </li>)}
        {active && !loading && <li className="chat-quick-replies">{!languageChosen ? <><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("es")} lang="es">Español</button><button className="secondary" disabled={blocked} onClick={() => void chooseLanguage("en")} lang="en">English</button></> : <>{(lastReply?.followUps.length ? lastReply.followUps : en ? ["Music", "Food", "Beaches", "History"] : ["Música", "Comida", "Playas", "Historia"]).slice(0, 4).map(text => <button className="secondary" key={text} disabled={blocked} onClick={() => void ask(text)}>{text}</button>)}</>}</li>}
        {active && props.onHandoff && (savedIds.length > 0 || messages.filter(row => row.role === "user").length >= 2) && !handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble"><p>{en ? "Want to take this with you on your phone?" : "¿Quieres llevarte esto en tu teléfono?"}</p><button className="secondary" disabled={blocked || !props.canHandoff} onClick={props.onHandoff}>{en ? "Continue on my phone" : "Continuar en mi teléfono"}</button>{!props.canHandoff && <p className="muted">{en ? "The operator needs to activate this kiosk to create a private QR." : "El operador debe activar este kiosco para crear un QR privado."}</p>}</div></li>}
        {handoff && <li className="chat-message assistant"><span className="mini-avatar" aria-hidden="true"><Image src="/assets/ary/ary-presentar.webp" alt="" width={30} height={30} sizes="30px" /></span><div className="bubble inline-handoff"><h2>{en ? "Take the experience with you" : "Llévate la experiencia"}</h2><p>{en ? "Scan with your phone and check the same number." : "Escanea con tu teléfono y comprueba el mismo número."}</p><Image src={`data:image/svg+xml,${encodeURIComponent(handoff.svg)}`} alt={en ? "Private handoff QR" : "QR privado para continuar"} width={220} height={220} unoptimized className="qr-image" /><p>{en ? "Confirmation code" : "Código de confirmación"} <strong className="confirmation-code">{handoff.confirmationCode}</strong></p><p>{en ? "Expires in" : "Caduca en"} {Math.max(0, Math.ceil((Date.parse(handoff.expiresAt) - (props.now || 0)) / 1000))} s</p><p className="muted">{en ? "Private, single use. Only language, interests and saved cards transfer. Keep it private." : "Privado y de un solo uso. Solo transfiere idioma, intereses y guardados. No lo compartas."}</p></div></li>}
      </ol>
      {(busy || loading || voice.processing) && <p className="chat-wait" role="status">{loading ? en ? "Opening our chat…" : "Abriendo nuestra charla…" : en ? "Ary is thinking…" : "Ary está pensando…"}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {voiceNotice && <p className="voice-notice" role="status">{voiceNotice} <button className="text-button" onClick={() => setKeyboard(true)}>{en ? "Use keyboard" : "Usar teclado"}</button></p>}
      <div ref={tail} />
    </div>
    <div className="voice-composer">
      {!active ? <button className="start-chat" disabled={disabled || !online} onClick={props.onStart}>{en ? "Start" : "Iniciar"} <span aria-hidden="true">→</span></button> : <>
        {keyboard && <form className="text-composer" onSubmit={event => { event.preventDefault(); void ask(message); }}><label className="sr-only" htmlFor="ary-message">{en ? "Your cultural question" : "Tu pregunta cultural"}</label><input ref={input} id="ary-message" maxLength={500} value={message} disabled={blocked} onChange={event => setMessage(event.target.value)} placeholder={en ? "Write to Ary…" : "Escríbele a Ary…"} /><button type="submit" disabled={blocked || !message.trim()} aria-label={en ? "Send question" : "Enviar pregunta"}><Icon kind="send" /></button></form>}
        <div className="voice-controls"><button className="secondary icon-button" aria-label={en ? "Use keyboard" : "Usar teclado"} aria-pressed={keyboard} onClick={() => { voice.cancel(); setKeyboard(value => !value); }}><Icon kind="keyboard" /></button><div className="mic-action"><button className={`microphone ${voice.recording ? "is-recording" : ""}`} disabled={(!voice.recording && blocked) || !online} aria-label={voice.recording ? en ? "Stop recording" : "Parar grabación" : en ? "Speak to Ary" : "Hablar con Ary"} aria-pressed={voice.recording} aria-describedby="mic-help" onClick={() => { if (voice.recording) voice.stopRecording(); else if (micAccepted) void voice.startRecording(); else { voice.interrupt(); setConsent(true); } }}><Icon kind={voice.recording ? "stop" : "mic"} /></button><span id="mic-help">{voice.recording ? `${en ? "Microphone active" : "Micrófono activo"} · ${voice.seconds}/15 s` : en ? "Tap to talk" : "Toca para hablar"}</span></div><button className="secondary icon-button" aria-label={voice.muted ? en ? "Enable Ary's voice" : "Activar voz de Ary" : en ? "Mute Ary's voice" : "Silenciar voz de Ary"} aria-pressed={voice.muted} onClick={() => { voice.toggleMute(); if (voice.muted && !voice.recording && !voice.processing && lastReply) void voice.play(lastReply); }}><Icon kind={voice.muted ? "mute" : "sound"} /></button></div>
        {voice.recording && <div className="voice-meter" aria-hidden="true">{[.6, .9, 1, .8, .5].map((scale, index) => <span key={index} style={{ transform: `scaleY(${.15 + voice.level * scale})` }} />)}</div>}
      </>}
      <p className="voice-privacy">{en ? "Voice goes to Google AI · Ary does not store audio" : "Voz enviada a Google IA · Ary no guarda el audio"} <a href="/privacidad" target="_blank" rel="noreferrer">{en ? "Privacy" : "Privacidad"}</a></p>
      {props.endControls}
    </div>
    <audio ref={node => { voice.bindAudio(node); }} onPlay={() => voice.activity("speaking")} onEnded={() => voice.activity("idle")} onPause={() => voice.activity("idle")} onError={voice.playbackFailed} />
    {consent && <MicrophoneConsent en={en} accept={() => { setConsent(false); setMicAccepted(true); void voice.startRecording(); }} close={() => { setConsent(false); setKeyboard(true); }} />}
  </section>;
}
