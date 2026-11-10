"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { Shell, useLocale } from "./shared";
import { Icon } from "./icons";
import { useRouter } from "next/navigation";
type Conversation = { id: string; createdAt: string; updatedAt: string; retentionUntil: string; firstMessage: string };
type Detail = { id: string; messages: { id: string; role: "user" | "assistant"; text: string }[] };
export function Conversations() {
  const router = useRouter();
  const [locale, setLocale] = useLocale(), en = locale === "en";
  const [rows, setRows] = useState<Conversation[]>([]), [detail, setDetail] = useState<Detail | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function load() {
    setError(""); setLoading(true);
    try { setRows((await api<{ conversations: Conversation[] }>("/api/conversations")).conversations); }
    catch (error) { setError(error instanceof ApiError ? error.code : "unavailable"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let live = true;
    void api<{ conversations: Conversation[] }>("/api/conversations").then(result => { if (live) setRows(result.conversations); }).catch(error => { if (live) setError(error instanceof ApiError ? error.code : "unavailable"); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch { setError("unavailable"); } finally { setBusy(false); } }
  const needsVerification = ["session_required", "verified_account_required"].includes(error);
  return <Shell locale={locale} setLocale={setLocale}><section className="flow-panel conversation-library"><p className="eyebrow">Ary · {en ? "Your story continues" : "Tu historia continúa"}</p><h1><Icon kind="conversations"/>{en ? "My conversations" : "Mis conversaciones"}</h1>
    <p>{en ? "Return to your ideas and keep discovering. Conversations are encrypted and kept for 90 days by default." : "Vuelve a tus ideas y sigue descubriendo. Las conversaciones se guardan cifradas durante 90 días por defecto."}</p>
    <div className="library-nav"><a href="/experiencia">{en ? "Talk to Ary" : "Habla con Ary"}</a><a href="/cuenta/privacidad"><Icon kind="privacy"/>{en ? "Privacy and data" : "Privacidad y datos"}</a></div>
    {loading ? <p role="status">{en ? "Loading conversations…" : "Cargando conversaciones…"}</p> : needsVerification ? <div className="notice"><h2>{en ? "Verify your email to see your conversations" : "Verifica tu correo para ver tus conversaciones"}</h2><p>{en ? "Your five trial questions stay in this temporary session. After verification, we save them with your history consent." : "Tus cinco preguntas de prueba permanecen en esta sesión temporal. Tras verificar el correo, las guardamos con tu consentimiento al historial."}</p><a className="button" href="/reingresar">{en ? "Request verification link" : "Solicitar enlace de verificación"}</a></div> : error === "history_consent_required" ? <div className="notice"><p>{en ? "Conversation history is turned off. You can authorize it in Privacy and data." : "El historial está desactivado. Puedes autorizarlo en Privacidad y datos."}</p><a href="/cuenta/privacidad">{en ? "Manage consent" : "Gestionar consentimiento"}</a></div> : !error && !rows.length ? <div className="notice"><h2>{en ? "Your next discovery starts here" : "Tu próximo descubrimiento empieza aquí"}</h2><p>{en ? "You have no saved conversations yet." : "Aún no tienes conversaciones guardadas."}</p><a className="button" href="/experiencia">{en ? "Start a conversation" : "Empezar una conversación"}</a></div> : <ul className="conversation-list">{rows.map(row => <li key={row.id}><button className="conversation-row secondary" disabled={busy} onClick={() => void run(async () => setDetail(await api<Detail>(`/api/conversations/${row.id}`)))}><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString(locale)}</time><strong>{row.firstMessage}</strong><span>{en ? "Open conversation" : "Abrir conversación"}</span></button></li>)}</ul>}
    {detail && <section className="conversation-detail" aria-label={en ? "Saved conversation" : "Conversación guardada"}><h2>{en ? "Let's pick up where we left off" : "Sigamos donde lo dejamos"}</h2><ol className="chat-messages">{detail.messages.map(row => <li className={`chat-message ${row.role}`} key={row.id}><strong>{row.role === "assistant" ? "Ary" : en ? "You" : "Tú"}</strong><p>{row.text}</p></li>)}</ol><div className="actions"><button disabled={busy} onClick={() => void run(async () => { await api(`/api/conversations/${detail.id}/continue`, "POST", {}); router.push("/experiencia"); router.refresh(); })}>{en ? "Continue this conversation" : "Continuar esta conversación"}</button><button className="secondary" disabled={busy} onClick={() => void run(async () => { await api(`/api/conversations/${detail.id}`, "DELETE", {}); setDetail(null); await load(); })}>{en ? "Delete conversation" : "Borrar conversación"}</button></div></section>}
    {error && !needsVerification && error !== "history_consent_required" && <p className="notice error" role="alert">{en ? "We couldn't load or update your conversations." : "No pudimos cargar o actualizar tus conversaciones."} <button className="text-button" onClick={() => void load()}>{en ? "Try again" : "Reintentar"}</button></p>}
  </section></Shell>;
}
