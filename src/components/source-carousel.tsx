"use client";
import { useId, useRef, useState } from "react";
import type { ChatSource } from "../server/ai/chat";
import type { Locale } from "../i18n";
import { uiText } from "../i18n/ui";
import { ItemPhoto } from "./item-photo";
import { MapsLink } from "./maps-link";
import { Icon } from "./icons";

type Props = { sources: ChatSource[]; locale: Locale; kiosk: boolean; directions?: boolean; first?: boolean; blocked: boolean; savedIds: string[]; onSave: (id: string) => void; onLocation?: (source: ChatSource) => void };
export function SourceCarousel({ sources, locale, kiosk, directions = false, first = false, blocked, savedIds, onSave, onLocation }: Props) {
  const track = useRef<HTMLDivElement>(null), trackId = useId(), [selected, setSelected] = useState(0);
  const en = locale === "en", multiple = sources.length > 1;
  function select(index: number) {
    const node = track.current, card = node?.children[index] as HTMLElement | undefined;
    if (!node || !card) return;
    node.scrollTo({ left: card.offsetLeft - (node.children[0] as HTMLElement).offsetLeft, behavior: "instant" });
    setSelected(index);
  }
  return <section className={`source-carousel${multiple ? " has-slides" : ""}`} aria-label={en ? "Cited cultural cards" : "Fichas culturales citadas"} aria-roledescription={multiple ? en ? "carousel" : "carrusel" : undefined}>
    <div ref={track} id={trackId} className="source-track" tabIndex={multiple ? 0 : undefined} onKeyDown={event => {
      if (!multiple || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      select(event.key === "Home" ? 0 : event.key === "End" ? sources.length - 1 : Math.max(0, Math.min(sources.length - 1, selected + (event.key === "ArrowRight" ? 1 : -1))));
    }} onScroll={() => {
      const node = track.current;
      if (node && multiple) setSelected(Math.round(node.scrollLeft / ((node.children[1] as HTMLElement).offsetLeft - (node.children[0] as HTMLElement).offsetLeft)));
    }}>
      {sources.map((source, index) => <article className="chat-card" key={source.id} aria-label={multiple ? `${index + 1} / ${sources.length} · ${source.title}` : undefined}>
        <ItemPhoto image={source.image} gallery={sources.length === 1 ? source.gallery : undefined} locale={locale} kiosk={kiosk} first={first && index === 0} />
        <h2>{source.title}</h2><p>{source.summary}</p>
        {directions && source.location && <p className="record-location"><Icon kind="pin" />{source.location}</p>}
        {directions && <MapsLink url={source.mapsUrl} locale={locale} kiosk={kiosk} />}
        {kiosk ? <p className="card-source">{uiText(locale, "source")} · {source.editor}</p> : <a className="card-source" href={source.url} target="_blank" rel="noopener noreferrer">{uiText(locale, "source")} · {source.editor}</a>}
        <div className="card-actions"><button className="secondary" disabled={blocked || savedIds.includes(source.id)} onClick={() => onSave(source.id)}><Icon kind="save" />{savedIds.includes(source.id) ? uiText(locale, "saved") : en ? "Save to My culture" : "Guardar en Mi cultura"}</button>
          {!kiosk && <a href={`/cultura/${source.id}`} target="_blank" rel="noopener noreferrer">{en ? "Open card" : "Abrir ficha"} <Icon kind="open" /></a>}
        </div>
        {!directions && source.mapsUrl && onLocation && <button className="secondary location-chip" disabled={blocked} onClick={() => onLocation(source)}><Icon kind="pin" />{en ? "Want the location?" : "¿Quieres la ubicación?"}</button>}
      </article>)}
    </div>
    {multiple && <div className="carousel-indicators" aria-label={en ? "Choose card" : "Elegir ficha"}>{sources.map((source, index) => <button type="button" className="secondary" key={source.id} aria-controls={trackId} aria-current={selected === index ? "true" : undefined} aria-label={`${en ? "Show card" : "Mostrar ficha"} ${index + 1} · ${source.title}`} onClick={() => select(index)}><span aria-hidden="true" />{index + 1}</button>)}</div>}
  </section>;
}
