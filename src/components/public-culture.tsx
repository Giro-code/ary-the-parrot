"use client";
import { dictionaries, type Locale } from "../i18n";
import { Shell, useLocale } from "./shared";
import type { Item } from "./types";
import { locationText } from "../location";
import { ItemPhoto } from "./item-photo";
import { MapsLink } from "./maps-link";
export function PublicCulture({ items }: { items: Partial<Record<Locale, Item>> }) {
  const [locale, setLocale] = useLocale(), t = dictionaries[locale], item = items[locale];
  return <Shell locale={locale} setLocale={setLocale}><article className="public-item">
    {item ? <><p className="eyebrow">Ary · {t.demo}</p><h1>{item.title}</h1><ItemPhoto image={item.image} locale={locale} large first /><p className="lead">{item.validatedDescription}</p><p>{item.sourceUrl && <a href={item.sourceUrl} rel="noopener noreferrer" target="_blank">{t.source}: {item.editor}</a>}</p><p>{locationText(item.location) && <><strong>{locale === "es" ? "Ubicación de la ficha: " : "Location from the source: "}</strong>{locationText(item.location)}</>}</p><MapsLink url={item.mapsUrl} locale={locale} /><p>{t.reviewed}: {item.sourceCheckedAt?.slice(0, 10)}</p><p>{t.publicQr}</p></> : <h1>{t.contentUnavailable}</h1>}
    <nav><a className="button" href="/experiencia">{t.experience}</a><a href="/#inicio">{t.home}</a></nav>
  </article></Shell>;
}
