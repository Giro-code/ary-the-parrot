import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {read,save,root} from './research.mjs';
const rows=await read('candidates.json',[]),sources=await read('evidence/stage10a2-articles.json',{});
const media=[...Object.values(await read('evidence/media.json',{})),...Object.values(await read('stage10a2-new-media.json',{}))];
const manifest=JSON.parse(await fs.readFile(path.join(root,'docs/catalog/evidence/10a2-final-pass2/manifest.json'),'utf8'));
const errors=[],checks=[];
for(const c of rows){
 const primary=c.sources.filter(s=>!s.url.includes('wikidata.org'));
 for(const s of primary)if(!Object.values(sources).some(v=>v.status===200&&v.extract&&v.url===s.url&&!v.extract.startsWith('Things To Do Immerse yourself')))errors.push(c.key+': missing concrete article evidence');
 for(const im of c.images){
  const hash=crypto.createHash('sha256').update(await fs.readFile(path.join(root,'public',im.file))).digest('hex');
  const m=media.find(m=>m.image?.file===im.file&&m.image?.sourceUrl===im.sourceUrl);
  if(!m||m.sha256!==hash)errors.push(c.key+': stored photographic provenance/hash mismatch');
  if(m&&['author','license','licenseUrl'].some(k=>m.image[k]!==im[k]))errors.push(c.key+': attribution mismatch');
  if(!manifest.some(x=>x.key===c.key&&x.sha256===hash))errors.push(c.key+': second visual pass manifest mismatch');
  checks.push({key:c.key,file:im.file,sha256:hash,source:im.sourceUrl,license:im.license});
 }
}
const used=new Set(rows.flatMap(c=>c.images.flatMap(im=>[im.file,im.thumb])).map(p=>path.basename(p)));
const unused=(await fs.readdir(path.join(root,'public/assets/catalog'))).filter(n=>n.endsWith('.webp')&&!used.has(n));
if(unused.length)errors.push('unreferenced WebP assets remain: '+unused.length);
const result={result:errors.length?'FAIL':'PASS',checkedAt:new Date().toISOString(),entries:rows.length,primaryArticleEvidence:true,apiCitationCount:rows.flatMap(c=>c.sources).filter(s=>/api\.php|\/w\/api|\/api\//.test(s.url)).length,unreferencedAssets:unused,errors,checks};
await save('evidence/stage10a2-final-audit.json',result);console.log(JSON.stringify({...result,checks:checks.length},null,2));process.exitCode=errors.length?1:0;
