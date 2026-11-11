import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

const files = [
  ["ciudad-colonial", "catedral"], ["haitises", "haitises"], ["altos-chavon", "chavon"],
  ["merengue", "Fallas2018 - Cavalcada Patrimoni 10 - Merengue República Dominicana.jpg"],
  ["bachata", "Amargue Bachata Quintet with Andre Veloz (22092585435).jpg"],
  ["mangu", "Dominican Mangu.jpg"], ["larimar", "Larimar.jpg"], ["ambar", "Amber 1.jpg"],
  ["ballenas", "View of Samaná Bay from the top 2.jpg"], ["carnaval", "CARNAVAL VEGANO 2020.jpg"],
];
await mkdir("public/assets/items", { recursive: true });
const evidence = [];
for (const [key, file] of files) {
  let buffer, source;
  if (["catedral", "haitises", "chavon"].includes(file)) {
    source = `public/assets/places/${file}.webp`;
    buffer = await readFile(source);
  } else {
    const name = file.replaceAll(" ", "_"), hash = createHash("md5").update(name).digest("hex");
    source = `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(name)}`;
    const response = await fetch(source, { headers: { "User-Agent": "AryCulturalWebsite/1.0 (credits in docs/IMAGE_CREDITS.md)" }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
  }
  for (const size of [1200, 480]) {
    const output = await sharp(buffer).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const path = `public/assets/items/${key}${size === 480 ? "-480" : ""}.webp`;
    await writeFile(path, output);
    const { width, height } = await sharp(output).metadata();
    evidence.push({ key, path, width, height, bytes: output.byteLength, sha256: createHash("sha256").update(output).digest("hex"), source });
    console.log(`${key} ${size}: ${width}x${height}, ${output.byteLength} bytes`);
  }
}
await mkdir("docs/evidence/stage9", { recursive: true });
await writeFile("docs/evidence/stage9/assets.json", JSON.stringify(evidence, null, 2) + "\n", "utf8");
