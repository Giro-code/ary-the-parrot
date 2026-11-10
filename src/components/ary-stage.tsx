"use client";
import { uiText } from "../i18n/ui";
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
  const selected = aryImage(state, cards, celebrating);
  const images = ["presentar", "pensar", "mostrar", "celebrar", ...(offlineImageAvailable ? ["sin-conexion"] : [])];
  const visible = selected === "sin-conexion" && !offlineImageAvailable ? "pensar" : selected;
  return <section className={`ary-stage ${state === "speaking" ? "is-speaking" : ""} ${selected === "sin-conexion" && !offlineImageAvailable ? "is-offline-fallback" : ""}`} data-ary-image={selected} aria-label={uiText(locale, "arySStage")}>
    <div className="ary-portrait" aria-hidden="true">{images.map(name => <Image key={name} src={`/assets/ary/ary-${name}.webp`} alt="" width={600} height={600} sizes="(max-width: 600px) 170px, (min-width: 1600px) 320px, 240px" preload={name === "presentar"} className={`ary-illustration ${visible === name ? "is-visible" : ""}`} />)}</div>
    <h1>{uiText(locale, "aLittleDominicanMagic")}</h1>
    <p className="ary-stage-status" role="status">{state === "offline" ? uiText(locale, "oopsNoSignalGiveMeAMoment") : state === "error" ? uiText(locale, "letSTryAgainIMHere") : state === "listening" ? uiText(locale, "microphoneActiveIMListening") : state === "thinking" ? uiText(locale, "letMeThink") : state === "speaking" ? uiText(locale, "aryIsSpeaking") : celebrating ? uiText(locale, "lovelyItSYoursToExplore") : uiText(locale, "yourParrotGuideYourOwnPace")}</p>
  </section>;
}
