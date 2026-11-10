"use client";
import Image from "next/image";
import type { RobotState } from "../robot/protocol";
import type { Locale } from "../i18n";

export function aryImage(state: RobotState, cards = false, celebrating = false) {
  if (state === "offline" || state === "error") return "sin-conexion";
  if (celebrating) return "celebrar";
  if (state === "listening" || state === "thinking") return "pensar";
  if (state === "handoff_qr" || (state === "speaking" && cards)) return "mostrar";
  return "presentar";
}
export function AryStage({ state, locale, cards, celebrating, offlineImageAvailable = false }: { state: RobotState; locale: Locale; cards?: boolean; celebrating?: boolean; offlineImageAvailable?: boolean }) {
  const selected = aryImage(state, cards, celebrating), en = locale === "en";
  const images = ["presentar", "pensar", "mostrar", "celebrar", ...(offlineImageAvailable ? ["sin-conexion"] : [])];
  const visible = selected === "sin-conexion" && !offlineImageAvailable ? "pensar" : selected;
  return <section className={`ary-stage ${state === "speaking" ? "is-speaking" : ""} ${selected === "sin-conexion" && !offlineImageAvailable ? "is-offline-fallback" : ""}`} data-ary-image={selected} aria-label={en ? "Ary's stage" : "El escenario de Ary"}>
    <div className="ary-portrait" aria-hidden="true">{images.map(name => <Image key={name} src={`/assets/ary/ary-${name}.webp`} alt="" width={600} height={600} sizes="(max-width: 600px) 170px, (min-width: 1600px) 320px, 240px" preload={name === "presentar"} className={`ary-illustration ${visible === name ? "is-visible" : ""}`} />)}</div>
    <h1>{en ? "A little Dominican magic" : "Un pedacito de Dominicana"}</h1>
    <p className="ary-stage-status" role="status">{state === "offline" ? en ? "Oops… no signal. Give me a moment." : "Uy… me quedé sin señal. Dame un momentito." : state === "error" ? en ? "Let's try again. I'm here." : "Probemos otra vez. Aquí estoy." : state === "listening" ? en ? "Microphone active · I'm listening" : "Micrófono activo · Te escucho" : state === "thinking" ? en ? "Let me think…" : "Déjame pensar…" : state === "speaking" ? en ? "Ary is speaking" : "Ary está hablando" : celebrating ? en ? "Lovely! It's yours to explore." : "¡Qué bien! Ya es parte de tu viaje." : en ? "Your parrot guide. Your own pace." : "Tu cotorra guía. A tu ritmo."}</p>
  </section>;
}
