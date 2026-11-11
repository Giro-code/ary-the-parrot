"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ItemImage } from "../server/item-media";
import type { Locale } from "../i18n";
import { Icon } from "./icons";

function ImageCredit({ image, locale, kiosk }: { image: ItemImage; locale: Locale; kiosk: boolean }) {
  const text = <>{image.credit} · Wikimedia Commons</>;
  return <figcaption className="image-credit">
    {image.illustrative && <strong>{locale === "es" ? "Foto ilustrativa" : "Illustrative photo"}{" · "}</strong>}
    {kiosk ? <>{text} · {image.license.code}</> : <><a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">{text}</a>{" · "}<a href={image.license.url} target="_blank" rel="noopener noreferrer">{image.license.code}</a></>}
    <span>{locale === "es" ? "WebP · encuadre adaptado" : "WebP · framing adapted"}</span>
  </figcaption>;
}
function PhotoDialog({ image, locale, kiosk, close, previous, next }: { image: ItemImage; locale: Locale; kiosk: boolean; close: () => void; previous?: () => void; next?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement;
    node?.showModal();
    node?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    return () => {
      node?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, []);
  return <dialog ref={dialog} className="photo-dialog" aria-labelledby={titleId} onCancel={close} onKeyDown={event => {
    if (event.key === "ArrowLeft" && previous) { event.preventDefault(); previous(); }
    if (event.key === "ArrowRight" && next) { event.preventDefault(); next(); }
    if (event.key !== "Tab") return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }}>
    <div className="photo-dialog-header"><h2 id={titleId}>{image.alt}</h2><button type="button" className="secondary" autoFocus onClick={close}>{locale === "es" ? "Cerrar foto" : "Close photo"}</button></div>
    <figure><Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 700px) 90vw, 1100px" loading="eager" /><ImageCredit image={image} locale={locale} kiosk={kiosk} /></figure>
    {previous && next && <div className="actions"><button className="secondary" onClick={previous}>{locale === "es" ? "Foto anterior" : "Previous photo"}</button><button className="secondary" onClick={next}>{locale === "es" ? "Foto siguiente" : "Next photo"}</button></div>}
  </dialog>;
}
export function ItemPhoto({ image, gallery, locale, kiosk = false, large = false, first = false }: { image?: ItemImage; gallery?: ItemImage[]; locale: Locale; kiosk?: boolean; large?: boolean; first?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [index, setIndex] = useState(0);
  if (!image) return null;
  const photos = gallery?.length ? gallery : [image];
  const contain = image.width < image.height || image.width / image.height > 2;
  return <>
    <figure className={`item-photo${large ? " photo-large" : ""}${contain ? " photo-contain" : ""}`}>
      <button type="button" className="photo-open" aria-label={`${locale === "es" ? "Ampliar foto" : "Enlarge photo"} · ${image.alt}`} onClick={() => { setIndex(0); setExpanded(true); }}>
        <Image src={large ? image.src : image.thumbnail} alt={image.alt} width={image.width} height={image.height} sizes={large ? "(max-width: 800px) calc(100vw - 88px), 684px" : "(max-width: 600px) calc(100vw - 110px), 480px"} loading={first ? "eager" : "lazy"} />
        <span className="photo-enlarge" aria-hidden="true"><Icon kind="open" /></span>
      </button>
      <ImageCredit image={image} locale={locale} kiosk={kiosk} />
    </figure>
    {photos.length > 1 && <div className="gallery-thumbnails" aria-label={locale === "es" ? "Galería de fotos" : "Photo gallery"}>{photos.map((photo, i) => <button className="secondary" key={`${photo.src}-${i}`} aria-label={`${locale === "es" ? "Ampliar foto" : "Enlarge photo"} ${i + 1} · ${photo.alt}`} onClick={() => { setIndex(i); setExpanded(true); }}><Image src={photo.thumbnail} alt={photo.alt} width={96} height={72} /><span>{i + 1} / {photos.length}</span><span>{photo.credit} · {photo.license.code}</span></button>)}</div>}
    {expanded && <PhotoDialog image={photos[index] || image} locale={locale} kiosk={kiosk} close={() => setExpanded(false)} previous={photos.length > 1 ? () => setIndex(i => (i + photos.length - 1) % photos.length) : undefined} next={photos.length > 1 ? () => setIndex(i => (i + 1) % photos.length) : undefined} />}
  </>;
}
