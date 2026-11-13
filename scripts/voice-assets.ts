// Public catalog export and server-side pre-generation. Dry-run is the default.
// Never loads .env files or Vercel credentials; execute mode requires server env.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCatalog } from "../data/catalog/validate.mjs";
import { type CatalogCandidate } from "../src/db/catalog-import.ts";

const output = resolve(process.argv.find(value => value.startsWith("--out="))?.slice(6) || ".cache/voice-assets");
const execute = process.argv.includes("--execute"), exportOnly = process.argv.includes("--export");
const candidates = JSON.parse(await readFile("data/catalog/candidates.json", "utf8")) as CatalogCandidate[];
const validation = await validateCatalog(candidates);
if (validation.errors.length) throw new Error("catalog_validation_failed");
const catalog = candidates.map(item => {
  const hash = createHash("sha256").update(`offline-es:${item.key}`).digest("hex");
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const source = item.sources.find(source => source.httpStatus === 200 && source.checkedAt && source.url.startsWith("https://"))!;
  return { id, title: item.title.es, summary: item.summary.es.slice(0, 600), aliases: [...item.aliases.es, ...item.tags], url: source.url, editor: source.editor };
});
const texts = ["¡Hola, hola! Soy Ary, la cotorra de República Dominicana. ¿Hablamos en español o en inglés?", "¡Hola, hola! Soy Ary, la cotorra de República Dominicana. Sin internet podemos descubrir música, comida e historia en mis fichas locales.", "¿Qué te gustaría descubrir? Música, comida, playas, historia… ¡Tú eliges!", ...catalog.map(item => item.summary)];
console.log(JSON.stringify({ mode: execute ? "execute" : exportOnly ? "export-public-only" : "dry-run", catalogItems: catalog.length, phrases: texts.length, output, providerCalls: execute ? texts.length : 0 }));
if (execute || exportOnly) {
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "catalog.json"), JSON.stringify(catalog, null, 2));
  await writeFile(resolve(output, "phrases.json"), JSON.stringify(texts, null, 2));
}
if (execute) {
  if (!process.env.GEMINI_API_KEY) throw new Error("server_key_required");
  const { synthesize } = await import("../src/server/ai/voice.ts");
  const cache = resolve(output, "voice-cache"); await mkdir(cache, { recursive: true });
  for (const text of [...new Set(texts)]) {
    const key = createHash("sha256").update(text.trim().split(/\s+/u).join(" ")).digest("hex");
    await writeFile(resolve(cache, `${key}.wav`), (await synthesize(text)).wav, { mode: 0o600 });
  }
}
