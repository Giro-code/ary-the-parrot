import type { Locale } from "../i18n";
import { Icon } from "./icons";

export function MapsLink({ url, locale, kiosk = false }: { url?: string; locale: Locale; kiosk?: boolean }) {
  if (!url || kiosk) return null;
  return <a className="button secondary maps-link" href={url} target="_blank" rel="noopener noreferrer"><Icon kind="pin" />{locale === "es" ? "Abrir en Google Maps" : "Open in Google Maps"}</a>;
}
