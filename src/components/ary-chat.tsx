"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";
import type { ChatReply } from "../server/ai/chat";
import { api, ApiError } from "./api";

type Message = { id: string; role: "user" | "assistant"; text: string; reply?: ChatReply };
export type ChatActivity = "listening" | "thinking" | "speaking" | "error";
export function AryChat({ locale, disabled = false, onActivity }: { locale: Locale; disabled?: boolean; onActivity?: (state: ChatActivity) => void }) {
  const [messages, setMessages] = useState<Message[]>([]), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const live = useRef(true), sending = useRef(false), activity = useRef(onActivity);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => { activity.current = onActivity; }, [onActivity]);
  const en = locale === "en";
  const lastReply = messages.findLast(row => row.reply)?.reply;
  const suggested = lastReply?.followUps.length ? lastReply.followUps : en ? ["Tell me about merengue", "What is mangú?", "What can I discover in nature?"] : ["Cuéntame sobre el merengue", "¿Qué es el mangú?", "¿Qué puedo descubrir en la naturaleza?"];
  useEffect(() => {
    live.current = true;
    void api<{ messages: Message[] }>("/api/chat").then(result => { if (live.current) setMessages(result.messages); }).catch(() => { if (live.current) setError(en ? "History could not be loaded. You can still ask a question." : "No se pudo cargar el historial. Puedes hacer una pregunta."); }).finally(() => { if (live.current) setLoading(false); });
    return () => { live.current = false; pending.current?.abort(); };
    // History belongs to the mounted session, independent of display-language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || clean.length > 500 || sending.current || disabled || limited) return;
    sending.current = true; setBusy(true); setError(null); activity.current?.("thinking");
    try {
      pending.current = new AbortController();
      const reply = await api<ChatReply>("/api/chat", "POST", { message: clean }, AbortSignal.any([pending.current.signal, AbortSignal.timeout(18000)]));
      if (!live.current) return;
      setMessages(rows => [...rows, { id: crypto.randomUUID(), role: "user", text: clean }, { id: crypto.randomUUID(), role: "assistant", text: reply.answer, reply }]);
      setMessage(""); activity.current?.("speaking");
    } catch (error) {
      if (!live.current) return;
      const limit = error instanceof ApiError && error.code === "rate_limited";
      const expired = error instanceof ApiError && error.code === "session_required";
      // A minute limit can recover. Keep the input available for an explicit later retry.
      if (expired) setLimited(true);
      setError(limit ? en ? "Message limit reached. Wait a minute before trying again. Each session allows up to 20 questions." : "Límite de mensajes alcanzado. Espera un minuto antes de reintentar. Cada sesión admite hasta 20 preguntas." : expired ? en ? "Your session expired. Start a new experience." : "Tu sesión caducó. Inicia una nueva experiencia." : en ? "Ary could not reply. Try sending your question again." : "Ary no pudo responder. Vuelve a enviar tu pregunta.");
      activity.current?.("error");
    } finally { sending.current = false; if (live.current) setBusy(false); }
  }
  return <section className="ary-chat" aria-labelledby="ary-chat-title">
    <h2 id="ary-chat-title">{en ? "Ask Ary" : "Pregúntale a Ary"}</h2>
    <p className="mode" role="status">{lastReply?.mode === "gemini" ? en ? "AI online · Gemini" : "IA en línea · Gemini" : en ? "Example responses" : "Respuestas de ejemplo"}</p>
    <p className="muted">{en ? "Cultural guidance with sources. Messages are temporary and deleted when the session ends. Avoid personal details." : "Orientación cultural con fuentes. Los mensajes son temporales y se borran al terminar la sesión. Evita incluir datos personales."}</p>
    <p className="muted">{en ? "Online answers are processed with Google Gemini." : "Las respuestas en línea se procesan con Google Gemini."} <a href="/privacidad">{en ? "Privacy" : "Privacidad"}</a></p>
    <div className="chat-suggestions" aria-label={en ? "Suggested questions" : "Preguntas sugeridas"}>{suggested.slice(0, 3).map(text => <button type="button" className="secondary" key={text} disabled={busy || disabled || limited || loading} onClick={() => void ask(text)}>{text}</button>)}</div>
    {loading && <p role="status">{en ? "Loading conversation…" : "Cargando conversación…"}</p>}
    <ol className="chat-messages" aria-label={en ? "Conversation" : "Conversación"} aria-live="polite" aria-relevant="additions">
      {messages.map(row => <li key={row.id} className={`chat-message ${row.role}`}><strong>{row.role === "user" ? en ? "You" : "Tú" : "Ary"}</strong><p>{row.text}</p>{row.reply && <><p className="muted">{row.reply.mode === "gemini" ? en ? "AI online · Gemini" : "IA en línea · Gemini" : en ? "Example responses" : "Respuestas de ejemplo"}</p>{row.reply.sources.length > 0 && <ul className="chat-sources">{row.reply.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{en ? "Source" : "Fuente"} · {source.title} — {source.editor}</a></li>)}</ul>}</>}</li>)}
    </ol>
    {busy && <p role="status">{en ? "Ary is thinking…" : "Ary está pensando…"}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void ask(message); }}>
      <label htmlFor="ary-message">{en ? "Your cultural question" : "Tu pregunta cultural"}</label>
      <textarea id="ary-message" name="message" rows={3} maxLength={500} value={message} disabled={busy || disabled || limited} onFocus={() => { if (!busy) activity.current?.("listening"); }} onChange={event => setMessage(event.target.value)} aria-describedby="ary-message-limit" />
      <p className="muted" id="ary-message-limit">{message.length}/500 · {en ? "Up to 20 questions per session" : "Hasta 20 preguntas por sesión"}</p>
      <button disabled={busy || disabled || limited || !message.trim()} type="submit">{busy ? en ? "Sending…" : "Enviando…" : en ? "Send question" : "Enviar pregunta"}</button>
    </form>
  </section>;
}
