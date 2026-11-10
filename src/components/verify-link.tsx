"use client";
import { useState } from "react";
import { api, ApiError } from "./api";
import { Shell, useLocale } from "./shared";
import { useRouter } from "next/navigation";
import { AccountArt } from "./account-visuals";
import { Icon } from "./icons";
export function VerifyLink({ token, kind = "recovery" }: { token: string; kind?: "recovery" | "marketing" | "unsubscribe" }) {
  const router = useRouter();
  const [locale, setLocale] = useLocale(), en = locale === "en";
  const [busy, setBusy] = useState(false), [error, setError] = useState<"link" | "network" | null>(null), [done, setDone] = useState(false);
  const invalid = !/^[\w-]{43}$/.test(token), unavailable = invalid || error === "link";
  async function confirm() {
    setBusy(true); setError(null);
    try {
      const path = kind === "recovery" ? "/api/auth/verify-link" : kind === "marketing" ? "/api/email/confirm" : `/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
      await api(path, "POST", kind === "unsubscribe" ? {} : { token });
      window.history.replaceState(null, "", window.location.pathname);
      if (kind === "recovery") { router.replace("/experiencia"); router.refresh(); }
      else setDone(true);
    } catch (error) { setError(error instanceof ApiError && error.code === "link_unavailable" ? "link" : "network"); } finally { setBusy(false); }
  }
  const title = unavailable ? en ? "Let's get you a new link" : "Vamos a pedir otro enlace" : done ? kind === "unsubscribe" ? en ? "You're unsubscribed" : "Ya te dimos de baja" : en ? "You're on the list!" : "¡Ya estás en la lista!" : kind === "recovery" ? en ? "Your conversation is waiting" : "Tu conversación te espera" : kind === "marketing" ? en ? "A little more of the island?" : "¿Un poquito más de la isla?" : en ? "Pause the updates?" : "¿Dejamos de enviarte novedades?";
  return <Shell locale={locale} setLocale={setLocale}><section className="account-journey link-journey">
    <AccountArt locale={locale} mood={error === "network" ? "sin-conexion" : unavailable ? "pensar" : done ? "celebrar" : "presentar"} envelope={!done && !unavailable}/>
    <div className="account-content"><h1>{title}</h1>
      {unavailable ? <div role="alert"><p>{en ? "This link has expired or has already been used. Request a new one to continue." : "El enlace no está disponible, caducó o ya se usó. Pide otro para continuar."}</p><a className="button" href="/reingresar">{en ? "Request a new link" : "Solicitar otro enlace"}</a></div> : done ? <p role="status">{kind === "unsubscribe" ? en ? "You won't receive more promotional emails." : "No recibirás más correos de promociones." : en ? "Your updates are confirmed. You can change them whenever you like." : "Tus novedades están confirmadas. Puedes cambiarlas cuando quieras."}</p> : <>
        <p>{kind === "recovery" ? en ? "Confirm and carry on chatting with Ary." : "Confirma y sigue conversando con Ary." : kind === "marketing" ? en ? "Confirm to receive Ary's news and promotions." : "Confirma para recibir novedades y promociones de Ary." : en ? "Confirm to stop receiving promotional emails." : "Confirma para dejar de recibir correos de promociones."}</p>
        <button disabled={busy} onClick={() => void confirm()}>{busy ? en ? "One moment…" : "Un momento…" : en ? "Confirm" : "Confirmar"}<Icon kind={kind === "recovery" ? "conversations" : "mail"}/></button>
      </>}
      {error === "network" && <p className="notice error" role="alert">{en ? "We couldn't connect. Check your connection and try again." : "No pudimos conectar. Revisa tu conexión y vuelve a intentarlo."}</p>}
      <div className="library-nav"><a href="/experiencia"><Icon kind="conversations"/>{en ? "Go to chat with Ary" : "Ir al chat con Ary"}</a><a href={`/privacidad?lang=${locale}`}><Icon kind="privacy"/>{en ? "Privacy notice" : "Aviso de privacidad"}</a>{done && <a href="/cuenta/privacidad">{en ? "Manage my preferences" : "Gestionar mis preferencias"}</a>}</div>
    </div>
  </section></Shell>;
}
