"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";
import { Icon, WelcomeEnvelope } from "./icons";

// The offline illustration ships later; until then, the thinking pose stands in.
const offlineArt = false;
export function AccountArt({ locale, mood = "presentar", envelope = false, bubble }: { locale: Locale; mood?: "presentar" | "pensar" | "celebrar" | "sin-conexion"; envelope?: boolean; bubble?: string }) {
  return <div className={`account-art account-art-${mood}`}>
    {bubble && <p className="ary-speech">{bubble}</p>}
    <div className="account-illustrations"><Image src={`/assets/ary/ary-${mood === "sin-conexion" && !offlineArt ? "pensar" : mood}.webp`} width={280} height={280} sizes="(max-width: 899px) 160px, 280px" alt={locale === "es" ? mood === "celebrar" ? "Ary feliz y celebrando" : mood === "sin-conexion" ? "Ary espera a que vuelva la conexión" : mood === "pensar" ? "Ary pensando" : "Ary te saluda" : mood === "celebrar" ? "Ary happily celebrating" : mood === "sin-conexion" ? "Ary waiting for the connection" : mood === "pensar" ? "Ary thinking" : "Ary waving hello"} preload/>
      {envelope && <WelcomeEnvelope label={locale === "es" ? "Sobre con un sello de la cotorra y el Caribe" : "An envelope with a Caribbean parrot stamp"}/>}</div>
  </div>;
}

export function EmailSteps({ locale }: { locale: Locale }) {
  const labels = locale === "es" ? ["Escribe tu correo", "Abre el enlace", "Sigue la conversación"] : ["Enter your email", "Open the link", "Keep talking"];
  return <ol className="email-steps" aria-label={locale === "es" ? "Cómo continuar" : "How to continue"}>{labels.map((label, index) => <li key={label}><Icon kind={index === 0 ? "mail" : index === 1 ? "open" : "conversations"}/><span>{label}</span></li>)}</ol>;
}

export function EmailSuccess({ locale, dryRun, onContinue }: { locale: Locale; dryRun: boolean; onContinue: () => void }) {
  const en = locale === "en", [seconds, setSeconds] = useState(4), title = useRef<HTMLHeadingElement>(null), next = useRef(onContinue);
  useEffect(() => { next.current = onContinue; }, [onContinue]);
  useEffect(() => {
    title.current?.focus();
    const start = Date.now();
    const timer = setInterval(() => { const remaining = Math.max(0, 4 - Math.floor((Date.now() - start) / 1000)); setSeconds(remaining); if (!remaining) { clearInterval(timer); next.current(); } }, 200);
    return () => clearInterval(timer);
  }, []);
  return <section className="email-success" aria-labelledby="email-success-title">
    <AccountArt locale={locale} mood="celebrar"/>
    <div role="status"><h1 id="email-success-title" ref={title} tabIndex={-1}>{dryRun ? en ? "You're ready to talk!" : "¡Todo listo para conversar!" : en ? "We sent you an email!" : "¡Te enviamos el correo!"}</h1>
      {dryRun ? <p className="test-mode">{en ? "Test mode: emails are not sent yet." : "Modo prueba: el correo no se envía todavía."}</p> : <p>{en ? "Check your " : "Revisa también tu bandeja de "}<strong>spam</strong>{en ? " folder too." : "."}</p>}</div>
    <p className="chat-countdown" role="timer" aria-live="off">{en ? `Continuing to the chat in ${seconds} s` : `Seguimos en el chat en ${seconds} s`}</p>
    <button onClick={onContinue}><Icon kind="conversations"/>{en ? "Go to chat now" : "Ir ya al chat"}</button>
  </section>;
}
