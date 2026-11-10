import { interests, type Interest, type Locale } from "./i18n/index.ts";

export const normalize = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
const keywords: Record<Interest, RegExp> = {
  music: /\b(musica|music|merengue|bachata|baile|dance)\b/,
  food: /\b(comida|food|mangu|gastronomia|cocina|cooking)\b/,
  nature: /\b(naturaleza|nature|playas?|beach|ballenas?|whales?|haitises)\b/,
  history: /\b(historia|history|colonial|heritage)\b/,
  art: /\b(arte|art|artesania|crafts?|larimar|ambar|amber)\b/,
  adventure: /\b(aventura|adventure|excursion|hiking)\b/,
};
export type ConversationPreferences = { locale: Locale; countryDeclared: string | null; interests: Interest[] };
// Only explicit declarations. Country never determines interests or model context.
export function conversationPreferences(text: string, current: ConversationPreferences): ConversationPreferences {
  const value = normalize(text);
  const locale = /^(english|in english|ingles|en ingles)[.! ]*$/.test(value) ? "en" : /^(espanol|spanish|en espanol)[.! ]*$/.test(value) ? "es" : current.locale;
  let countryDeclared = current.countryDeclared;
  if (/prefiero no decirlo|prefer not to say/.test(value)) countryDeclared = null;
  else {
    const declaration = value.match(/(?:soy de|vengo de|visito desde|i am from|i'm from|im from)\s+(.+?)[.!?]*$/)?.[1];
    if (declaration) {
      const countries = ["AR", "BO", "BR", "CA", "CL", "CN", "CO", "CU", "DE", "DO", "ES", "FR", "GB", "HT", "IT", "JM", "JP", "MX", "PR", "US", "VE"];
      countryDeclared = countries.find(code => ["es", "en"].some(lang => normalize(new Intl.DisplayNames([lang], { type: "region" }).of(code) || "") === declaration.trim()) || code.toLowerCase() === declaration.trim()) || countryDeclared;
    }
  }
  return { locale, countryDeclared, interests: [...new Set([...current.interests, ...interests.filter(interest => keywords[interest].test(value))])] };
}
