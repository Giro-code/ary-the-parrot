import {topics} from './topics.mjs';
import {request,read,save,label,claim,ids,data,entities} from './research.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
let all=await read('evidence/entities.json',{}), resolved=await read('topic-resolved.json',[]);
const entries=Object.entries(topics).flatMap(([kind,names])=>names.map(title=>({kind,title})));
for(let start=0;start<entries.length;start+=30){
 const batch=entries.slice(start,start+30).filter(x=>!resolved.some(y=>y.title===x.title && y.id)); if(!batch.length) continue;
 const r=await request('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',sites:'enwiki',titles:batch.map(x=>x.title).join('|'),props:'labels|descriptions|aliases|claims|sitelinks',languages:'es|en',format:'json'}));
 const found=Object.values(r.body?.entities||{}).filter(e=>e.id?.startsWith('Q'));
 for(const e of found)all[e.id]=e;
 for(const x of batch){const e=found.find(e=>e.sitelinks?.enwiki?.title?.toLowerCase()===x.title.toLowerCase());resolved=resolved.filter(y=>y.title!==x.title);resolved.push({...x,id:e?.id||null});}
 await save('topic-resolved.json',resolved);await save('evidence/entities.json',all);
 console.log('TOPICS',Math.min(start+30,entries.length),'/',entries.length,'found',found.length);
}
await fs.writeFile(path.join(data,'topics.tsv'),resolved.map(x=>[x.kind,x.id||'MISSING',x.title,x.id?label(all[x.id]):'',x.id?(all[x.id].descriptions?.es?.value||all[x.id].descriptions?.en?.value||''):'',x.id?claim(all[x.id],'P18')[0]||'':''].join('\t')).join('\n')+'\n','utf8');
const parents=[...new Set(Object.values(all).flatMap(e=>ids(e,'P131')))];
await entities(parents);
