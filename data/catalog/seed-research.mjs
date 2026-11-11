import fs from 'node:fs/promises';
import path from 'node:path';
import {root,read,save,request} from './research.mjs';
import {photoMetadata} from './media.mjs';
const source=await fs.readFile(path.join(root,'src/db/seed.ts'),'utf8');
const original=[];
for(const line of source.split('\n').filter(l=>/^  \{ key:/.test(l))){
 const row={};for(const field of ['key','title','url','editor','es','en']){const m=line.match(new RegExp('(?:^|[, {])'+field+': ("(?:[^"\\\\]|\\\\.)*")'));if(m)row[field]=JSON.parse(m[1]);}
 if(row.key)original.push(row);
}
await save('preserved-seed.json',original);
const results=[];
for(const s of original){const r=await request(s.url,{json:false});results.push({key:s.key,url:s.url,status:r.status,checkedAt:r.checkedAt});console.log('SEED SOURCE',s.key,r.status);}
await save('evidence/seed-source-checks.json',results);
const mediaSource=await fs.readFile(path.join(root,'src/db/seed-media.ts'),'utf8');
const files=[...mediaSource.matchAll(/sourceUrl: commons\("([^"]+)"\)/g)].map(m=>decodeURIComponent(m[1]).replaceAll('_',' '));
await photoMetadata([...files,'Guloyas de SPM.png','Guloya de San Pedro de Macoris.jpg']);
await save('seed-media-filenames.json',files);
