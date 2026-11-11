import fs from 'node:fs/promises';
import path from 'node:path';
import {read,save,root,date,request,locked} from './research.mjs';
import {photoMetadata,filePages,materializePhoto} from './media.mjs';
const original=await read('preserved-seed.json',[]),checks=await read('evidence/seed-source-checks.json',[]);
const seedText=await fs.readFile(path.join(root,'src/db/seed-media.ts'),'utf8'),files={};
for(const line of seedText.split('\n')){const key=line.match(/^\s*(?:"([^"]+)"|(\w+)): \{/),file=line.match(/sourceUrl: commons\("([^"]+)"\)/);if(key&&file)files[key[1]||key[2]]=decodeURIComponent(file[1]).replaceAll('_',' ');}
files.cocolo='Guloyas de SPM.png';files.congos='Estatua de Sixto Minier.jpg';
const enTitles={'ciudad-colonial':'Colonial City of Santo Domingo',merengue:'Merengue',bachata:'Bachata',cocolo:'Cocolo dance drama',congos:'Congos of Villa Mella',mangu:'Mangú',larimar:'Larimar',ambar:'Dominican amber',haitises:'Los Haitises National Park',ballenas:'Humpback whales of Samaná',carnaval:'La Vega Carnival','altos-chavon':'Altos de Chavón'};
const qids={'ciudad-colonial':'Q2470834',merengue:'Q282131',bachata:'Q40461',cocolo:'Q5139799',congos:'Q2993007',mangu:'Q9027405',larimar:'Q2502146',ambar:'Q898798',haitises:'Q42090',ballenas:'Q132905',carnaval:null,'altos-chavon':'Q444485'};
const kinds={'ciudad-colonial':'place',merengue:'music',bachata:'music',cocolo:'tradition',congos:'tradition',mangu:'food',larimar:'craft',ambar:'craft',haitises:'nature',ballenas:'species',carnaval:'tradition','altos-chavon':'place'};
const provinces={'ciudad-colonial':'Distrito Nacional',cocolo:'San Pedro de Macorís',congos:'Santo Domingo',larimar:'Barahona',haitises:'Hato Mayor',ballenas:'Samaná',carnaval:'La Vega','altos-chavon':'La Romana'};
await photoMetadata(Object.values(files));await filePages(Object.values(files));
const contextual=await request('https://alcaldiasdn.gob.do/turismo/',{json:false});
for(const old of original){
 const current=(await read('candidates.json',[])).find(c=>c.key===old.key),check=checks.find(x=>x.key===old.key);
 let entry=current;
 if(!entry){
  if(check?.status!==200){console.log('SEED PENDING',old.key,'no currently verified primary source');continue;}
  const title={es:old.title,en:enTitles[old.key]},desc={es:old.es,en:old.en};
  entry={key:old.key,status:'draft',kind:kinds[old.key],tags:[kinds[old.key]==='food'?'food':kinds[old.key]==='music'?'music':['species','nature'].includes(kinds[old.key])?'nature':kinds[old.key]==='craft'?'art':'history'],wikidata:qids[old.key],province:provinces[old.key]||'Ámbito nacional',title,aliases:{es:[old.title.toLowerCase(),old.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()],en:[enTitles[old.key].toLowerCase()]},summary:{es:old.es.split(/(?<=\.)\s/)[0],en:old.en.split(/(?<=\.)\s/)[0]},description:desc,facts:[{text:desc,sourceUrl:old.url}],sources:[{url:old.url,editor:old.editor,checkedAt:date,httpStatus:200}],images:[],reviewNotes:'Ficha inicial conservada con la misma key. Borrador sujeto a aprobación humana.'};
 }
 if(check?.status===200){entry.description={es:old.es,en:old.en};entry.summary={es:old.es.split(/(?<=\.)\s/)[0],en:old.en.split(/(?<=\.)\s/)[0]};entry.facts=[{text:{...entry.description},sourceUrl:old.url}];entry.sources=[{url:old.url,editor:old.editor,checkedAt:date,httpStatus:200},...entry.sources.filter(s=>s.url!==old.url)];}
 entry.kind=kinds[old.key];entry.title={es:old.title,en:enTitles[old.key]};entry.province=provinces[old.key]||entry.province;entry.wikidata=qids[old.key];
 if(!['place','nature'].includes(entry.kind))delete entry.location;
 if(!entry.images.length || old.key==='congos'){
  try{const media=await materializePhoto(files[old.key],old.key,entry.title);entry.images=[media.image];}catch(e){console.log('SEED PHOTO PENDING',old.key,String(e));continue;}
 }
 if(old.key==='congos'){
  entry.images[0].alt={es:'Estatua de Sixto Minier en Villa Mella; imagen contextual de la tradición de los Congos',en:'Statue of Sixto Minier in Villa Mella; contextual image for the Congos tradition'};
  entry.reviewNotes+=' Fotografía contextual de una estatua de Sixto Minier, no de una ceremonia. Revisar la relación entre monumento y tradición y los derechos de la escultura antes de aprobar.';
  if(contextual.status===200)entry.sources.push({url:contextual.url,editor:'Ayuntamiento Municipal de Santo Domingo Norte',checkedAt:date,httpStatus:200});
 }
 if(old.key==='ballenas')entry.images[0].alt={es:'Vista de la Bahía de Samaná, paisaje relacionado con las ballenas de la ficha',en:'View of Samaná Bay, the landscape associated with the whales in this entry'};
 if(old.key==='cocolo')entry.reviewNotes+=' Foto de baja resolución de Guloyas, conservada sin ampliación. Revisar identificación y calidad documental.';
 await locked('candidates',async()=>{const rows=await read('candidates.json',[]);const i=rows.findIndex(c=>c.key===entry.key);if(i<0)rows.push(entry);else rows[i]=entry;await save('candidates.json',rows);});
 console.log('SEED RETAINED',entry.key);
}
