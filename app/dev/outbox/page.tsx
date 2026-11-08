import { notFound } from "next/navigation";
import { getConnection } from "../../../src/db/client";
import { getDryRunMessages } from "../../../src/server/email/outbox";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  let messages: Awaited<ReturnType<typeof getDryRunMessages>> = [], unavailable = false;
  try { messages = await getDryRunMessages((await getConnection()).db); } catch { unavailable = true; }
  return <div className="ary-app"><main id="main"><h1>Bandeja de prueba</h1><p className="notice">Modo prueba: estos correos no salieron de la máquina. Usa únicamente direcciones y datos sintéticos en esta demo local. Últimas 24 horas, máximo 30 mensajes.</p><p><a href="/reingresar">Solicitar enlace</a> · <a href="/cuenta/privacidad">Privacidad</a></p>{unavailable ? <p role="alert">Servicio no disponible. Comprueba la base de datos local y recarga.</p> : !messages.length ? <p>No hay mensajes de prueba recientes.</p> : messages.map(message => <article className="outbox-message" key={message.id} data-template={message.template}><h2>{message.subject}</h2><p>Para: {message.to} · dry_run · <time>{message.createdAt}</time></p><pre>{message.text}</pre><nav className="actions" aria-label={`Enlaces ${message.id}`}>{[...new Set(message.text.match(/https?:\/\/[^\s]+/g) || [])].map((url, i) => <a key={url} href={url}>{i === 0 ? "Abrir enlace" : "Preferencias / baja"}</a>)}</nav><details><summary>Ver HTML renderizado</summary><iframe sandbox="" srcDoc={message.html} title={`HTML ${message.subject}`} /></details></article>)}</main></div>;
}
