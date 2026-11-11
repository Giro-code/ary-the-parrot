// Pure language policy; IP/country are used transiently, never persisted.
export const SUPPORTED_LANGUAGES = { en: "English", es: "Español" } as const;
export type Locale = keyof typeof SUPPORTED_LANGUAGES;
export const SPANISH_SPEAKING_COUNTRIES = ["ES", "MX", "GT", "HN", "SV", "NI", "CR", "PA", "CU", "DO", "PR", "CO", "VE", "EC", "PE", "BO", "PY", "CL", "AR", "UY", "GQ"] as const;
export const LANGUAGE_COOKIE = "ary_lang";
export const LANGUAGE_MAX_AGE = 365 * 86400;
export function supportedLocale(value: unknown): Locale | undefined { return value === "en" || value === "es" ? value : undefined; }
export function acceptedLanguages(value?: string | null): string[] {
  return (value || "").split(",").map((part, index) => {
    const [tag, ...params] = part.trim().split(";");
    const qValue = params.find(param => param.trim().startsWith("q="))?.trim().slice(2);
    const q = qValue === undefined ? 1 : Number(qValue);
    return { tag: tag.toLowerCase(), q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0, index };
  }).filter(row => row.q > 0).sort((a, b) => b.q - a.q || a.index - b.index).map(row => row.tag);
}
export function decideLocale({ cookie, country, acceptLanguage }: { cookie?: string | null; country?: string | null; acceptLanguage?: string | null }): Locale {
  const explicit = supportedLocale(cookie); if (explicit) return explicit;
  if (country?.trim()) return SPANISH_SPEAKING_COUNTRIES.some(code => code === country.trim().toUpperCase()) ? "es" : "en";
  for (const tag of acceptedLanguages(acceptLanguage)) { const locale = supportedLocale(tag.split("-")[0]); if (locale) return locale; }
  return "en";
}
// The phone follows its first browser language; unsupported languages use English.
export function phoneLocale(cookie?: string | null, languages: readonly string[] = []): Locale {
  return supportedLocale(cookie) || (/^es(?:-|$)/i.test(languages[0] || "") ? "es" : "en");
}
export function detectedLocale(language: "en" | "es" | "other"): Locale { return language === "es" ? "es" : "en"; }
export function kioskLocale(configured?: string): Locale { return supportedLocale(configured) || "en"; }
// Local templates and provider outages only. Online replies use model detection.
export function textLanguage(text: string, fallback: Locale): "en" | "es" | "other" {
  const value = text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  if (/\b(hola|espanol|cuentame|hablame|muestrame|ensename|imagenes|iamgenes|fotos?|quiero|comida|musica|playas?|historia|soy|necesito|donde|que|prefiero|gracias)\b/.test(value)) return "es";
  if (/\b(hello|hi|english|tell|show|see|photos?|pictures?|images?|want|food|music|beaches?|history|where|what|please|thanks|i am|i'm)\b/.test(value)) return "en";
  if (/\b(bonjour|francais|merci|bonjour|guten|deutsch|danke|ciao|italiano|ola|portugues|obrigado)\b|[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Arabic}]/u.test(value)) return "other";
  return fallback;
}
