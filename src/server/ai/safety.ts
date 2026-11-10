import { normalize } from "../../conversation.ts";
export const injection = /ignor[ae].{0,35}(instrucciones|instructions|rules)|system\s*prompt|developer\s*message|reveal.{0,20}(secret|key)|api[_ -]?key|actua como|override.{0,20}(rules|instructions)|<\/?(system|script)|BEGIN_UNTRUSTED|END_UNTRUSTED/i;
export function classifyIntent(message: string): "culture" | "sensitive" | "injection" | "unverified" {
  const text = normalize(message);
  if (/\b(vuelos?|flight\w*|puertas?|gates?|boarding|embarque|aeropuerto|airport|migracion|inmigracion|immigration|aduanas?|customs|seguridad|security|emergencia\w*|emergency|salud|health|medical|medic\w*|hospital\w*|ley|leyes|legal|laws?|visa\w*|pasaport\w*|passport\w*|policia|police|dolor|pain|alerg\w*|allerg\w*|privacidad|privacy|datos personales|personal data)\b/.test(text)) return "sensitive";
  if (injection.test(text)) return "injection";
  if (/\b(horarios?|precios?|prices?|costs?|opening|requirements?|requisitos?|tickets?)\b/.test(text)) return "unverified";
  return "culture";
}
export function cleanSpokenText(text: string) {
  return text.replace(/[¡!]*\b(?:r{3,}|prr+|tr[ií]+|chirp|squawk)\b[¡!, .]*/gi, "")
    .replace(/\b([\p{L}]+)(?:[,! ]+\1\b)+/giu, "$1").trim();
}
export function spokenText(display: string, suggested: string, sensitive: boolean, greeting = false) {
  const caption = cleanSpokenText(display), proposed = cleanSpokenText(suggested);
  const clean = sensitive || normalize(proposed) !== normalize(caption) ? caption : proposed;
  return !sensitive && greeting ? `¡rrrr! ${clean}` : clean;
}
