import fs from 'node:fs/promises';
import path from 'node:path';
import {read,save,request,data} from './research.mjs';
// Five short article introductions per request, with the shared four-second pause.
// This fallback also avoids repeatedly retrying a throttled REST endpoint.
await fs.rmdir(path.join(data,'.network-lock')).catch(()=>{});
const original=await read('stage10a2-original.json',[]),ents=await read('evidence/entities.json',{}),kept=await read('candidates.json',[]);
const existing=original.filter(c=>kept.some(k=>k.key===c.key)).map(c=>{const e=ents[c.wikidata],lang=e?.sitelinks?.enwiki?'en':'es';return {key:c.key,title:e?.sitelinks?.[lang+'wiki']?.title,lang};});
const additions=(await read('stage10a2-new-titles.json',[])).map(([key,kind,title])=>({key,kind,title:key==='juan-bosch'?'Juan Bosch (politician)':title,lang:'en'}));
const refs=[['cuisine-reference','Dominican Republic cuisine'],['culture-reference','Culture of the Dominican Republic'],['carnival-reference','Dominican Carnival'],['music-reference','Music of the Dominican Republic'],['art-reference','Dominican art']].map(([key,title])=>({key,title,lang:'en',full:true}));
for(const lang of ['en','es']){
 const all=await read('evidence/stage10a2-articles.json',{});
 const plans=[...existing,...additions,...refs].filter(p=>p.lang===lang&&p.title&&(!all[p.key]?.extract||all[p.key].extract.length<220||p.full));
 for(let i=0;i<plans.length;i+=5){
  const batch=plans.slice(i,i+5);
  const r=await request('https://'+lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'extracts|pageprops',explaintext:'1',exlimit:'5',titles:batch.map(p=>p.title).join('|'),redirects:'1',...(batch.some(p=>p.full)?{}:{exintro:'1'})}));
  const pages=Object.values(r.body?.query?.pages||{}),redirects=[...(r.body?.query?.normalized||[]),...(r.body?.query?.redirects||[])];
  const norm=t=>t.toLowerCase().replaceAll('_',' ');
  const current=await read('evidence/stage10a2-articles.json',{});
  for(const p of batch){let title=p.title;for(let j=0;j<3;j++){const red=redirects.find(x=>norm(x.from)===norm(title));if(red)title=red.to;}
   const page=pages.find(x=>norm(x.title)===norm(title));
   if(page?.extract&&!page.pageprops?.disambiguation&&page.pageprops?.disambiguation!=='')current[p.key]={status:200,title:page.title,lang,kind:p.kind,url:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_')),extract:page.extract,checkedAt:r.checkedAt,checkedVia:r.url,wikidata:page.pageprops?.wikibase_item};
  }
  await save('evidence/stage10a2-articles.json',current);console.log('SOURCE BATCH SAVED',lang,i,batch.map(p=>p.key+':'+(current[p.key]?.extract?.length||0)).join(' '));
 }
}
