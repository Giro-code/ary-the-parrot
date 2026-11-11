"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ItemImage } from "../server/item-media";
import type { Locale } from "../i18n";
import { Icon } from "./icons";

function ImageCredit({ image, locale, kiosk }: { image: ItemImage; locale: Locale; kiosk: boolean }) {
  const text = <>{image.credit} · Wikimedia Commons</>;
  return <figcaption className="image-credit">
    {kiosk ? <>{text} · {image.license.code}</> : <><a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">{text}</a>{" · "}<a href={image.license.url} target="_blank" rel="noopener noreferrer">{image.license.code}</a></>}
    <span>{locale === "es" ? "WebP · encuadre adaptado" : "WebP · framing adapted"}</span>
  </figcaption>;
}
function PhotoDialog({ image, locale, kiosk, close }: { image: ItemImage; locale: Locale; kiosk: boolean; close: () => void }) {
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
  </dialog>;
}
export function ItemPhoto({ image, locale, kiosk = false, large = false, first = false }: { image?: ItemImage; locale: Locale; kiosk?: boolean; large?: boolean; first?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!image) return null;
  const contain = image.width < image.height || image.width / image.height > 2;
  return <>
    <figure className={`item-photo${large ? " photo-large" : ""}${contain ? " photo-contain" : ""}`}>
      <button type="button" className="photo-open" aria-label={`${locale === "es" ? "Ampliar foto" : "Enlarge photo"} · ${image.alt}`} onClick={() => setExpanded(true)}>
        <Image src={large ? image.src : image.thumbnail} alt={image.alt} width={image.width} height={image.height} sizes={large ? "(max-width: 800px) calc(100vw - 88px), 684px" : "(max-width: 600px) calc(100vw - 110px), 480px"} loading={first ? "eager" : "lazy"} />
        <span className="photo-enlarge" aria-hidden="true"><Icon kind="open" /></span>
      </button>
      <ImageCredit image={image} locale={locale} kiosk={kiosk} />
    </figure>
    {expanded && <PhotoDialog image={image} locale={locale} kiosk={kiosk} close={() => setExpanded(false)} />}
  </>;
}
