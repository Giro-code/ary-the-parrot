import { normalize } from "../../conversation.ts";

const stopWords = new Set("como que cual cuales llego llegar quiero donde queda esta estan estas ubicacion mapa location want where would like directions take visitar visit reach tell about cuentame sobre hablame muestrame ensename ver imagenes iamgenes imagen fotos foto fotografias fotografia pictures picture photos photo images image show see republica dominicana dominican republic rd the los las del una unos unas para por con from some please puedes podrias mas more esas esos sus them their".split(" "));
function tokens(text: string) {
  return normalize(text).split(/[^a-z0-9]+/).filter(word => word.length >= 3 && !stopWords.has(word));
}
function forms(word: string) {
  return [word, ...(word.length > 3 && word.endsWith("s") ? [word.slice(0, -1)] : []), ...(word.length > 4 && word.endsWith("es") ? [word.slice(0, -2)] : [])];
}
export const hasSearchTerms = (message: string) => tokens(message).length > 0;
// Whole tokens avoid incidental substring matches. Interests only break ties in chat.
export function lexicalScore(item: { title: string; summary: string; tags: string[] }, message: string) {
  const indexed = new Set(tokens(`${item.title} ${item.summary} ${item.tags.join(" ")}`).flatMap(forms));
  return [...new Set(tokens(message))].reduce((score, word) => score + (forms(word).some(form => indexed.has(form)) ? 3 : 0), 0);
}
