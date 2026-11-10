import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const images = [
  ['catedral', 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Catedral_Santo_Domingo.jpg'],
  ['haitises', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Los_Haitises.jpg'],
  ['chavon', 'https://upload.wikimedia.org/wikipedia/commons/d/da/Altos_de_Chavon-2.JPG'],
];
await mkdir('public/assets/places', {recursive:true});
for (const [name,url] of images) {
  const response = await fetch(url, {headers:{'User-Agent':'AryCulturalWebsite/1.0 (Wikimedia attribution in docs/IMAGE_CREDITS.md)'}});
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  for (const size of [640,1600]) {
    const source = sharp(buffer).rotate();
    if (name === 'catedral') source.extract({left:0,top:0,width:1280,height:700});
    const image = await source.resize({width:size,withoutEnlargement:true}).webp({quality:80}).toBuffer();
    await writeFile(`public/assets/places/${name}${size===640?'-640':''}.webp`,image);
    console.log(`${name} ${size}: ${image.byteLength} bytes`);
  }
}
