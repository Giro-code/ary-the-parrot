import fs from 'node:fs/promises';
import path from 'node:path';
import {read,save,label,claim,ids,date,data,request,commitCandidates} from './research.mjs';
import {photoMetadata,filePages,materializePhoto} from './media.mjs';
import {editorial} from './editorial.mjs';
import {slug,bilingual,seedKeys,provinceOf,sourceIndex} from './build-geo.mjs';

const additionalSeedPhoto={Q282131:'Fallas2018 - Cavalcada Patrimoni 10 - Merengue República Dominicana.jpg',Q40461:'Amargue Bachata Quintet with Andre Veloz (22092585435).jpg',Q2502146:'Larimar.jpg',Q898798:'Amber 1.jpg',Q5139799:'Guloyas de SPM.png',Q2993007:'Estatua de Sixto Minier.jpg'};
const topicNames={Q882965:'Cotorra de La Española',Q754041:'Solenodonte de La Española',Q549103:'Jutía de La Española',Q845457:'Cigua palmera',Q132905:'Ballenas jorobadas de Samaná'};
const rejectedIds=new Set(['Q2529896','Q1877591','Q642702','Q5139863','Q2916401','Q37153','Q632559','Q1576','Q210623','Q136556338','Q1192302']);
let all=await read('evidence/entities.json',{}),summaries=await read('evidence/summaries.json',{}),resolved=await read('topic-resolved.json',[]);
const sources=await sourceIndex(),plan=[],overrides=await read('image-overrides.json',{});
for(const x of resolved){
 const s=summaries[x.title],e=all[x.id];if(!x.id||s?.status!==200||s.type==='disambiguation'||rejectedIds.has(x.id)||!s.extract)continue;
 const existing=await read('candidates.json',[]);if(existing.some(c=>c.wikidata===x.id))continue;
 let prose=editorial[x.id],kind=x.kind;
 if(!prose&&kind==='species'){
  if(!/Hispaniola|Dominican Republic/i.test(s.extract))continue;
  const name=topicNames[x.id]||label(e)||s.title;
  const noun=/bird|tody|trogon|woodpecker|crow|owl|warbler|swallow|cuckoo|hummingbird|nightjar|parakeet|crossbill|tanager|vireo|oriole|thrush|piculet|elaenia/i.test(s.extract)?['ave','bird']:/plant|tree|palm|pine|cactus/i.test(s.extract)?['planta','plant']:/mammal/i.test(s.extract)?['mamífero','mammal']:/lizard|iguana|reptile|snake|boa|gecko|slider|turtle/i.test(s.extract)?['reptil','reptile']:['especie','species'];
  prose=[name,x.title,name+' es '+(noun[0]==='ave'?'un ave':'una especie de '+noun[0])+' documentada en La Española.',x.title+' is a '+noun[1]+' documented on Hispaniola.'];
 }
 if(!prose&&['region','nature','museum','place'].includes(kind)){
  if(!/Dominican|Hispaniola/i.test(s.extract))continue;
  const name=label(e)||s.title;
  let noun;
  if(kind==='region')noun=(/ Province$/.test(x.title)||ids(e,'P31').includes('Q913337'))?['provincia dominicana','Dominican province']:x.title==='Distrito Nacional'?['demarcación dominicana','Dominican administrative area']:x.title==='Cibao'?['región dominicana','Dominican region']:['localidad dominicana','Dominican locality'];
  if(kind==='nature')noun=/national park/i.test(s.extract)?['parque nacional dominicano','Dominican national park']:/river/i.test(s.extract)?['río dominicano','Dominican river']:/mountain|peak/i.test(s.extract)?['relieve montañoso dominicano','Dominican mountain landform']:/island|cay/i.test(s.extract)?['isla o cayo dominicano','Dominican island or cay']:/bay/i.test(s.extract)?['bahía dominicana','Dominican bay']:/cave/i.test(s.extract)?['cueva dominicana','Dominican cave']:/waterfall/i.test(s.extract)?['cascada dominicana','Dominican waterfall']:/dam|reservoir/i.test(s.extract)?['presa dominicana','Dominican dam']:/lagoon|lake/i.test(s.extract)?['laguna o lago dominicano','Dominican lagoon or lake']:null;
  if(kind==='museum')noun=['museo de la República Dominicana','museum in the Dominican Republic'];
  if(kind==='place')noun=/market/i.test(s.extract)?['mercado de Santo Domingo','market in Santo Domingo']:/zoo/i.test(s.extract)?['parque zoológico dominicano','Dominican zoological park']:/aquarium/i.test(s.extract)?['acuario dominicano','Dominican aquarium']:/theat/i.test(s.extract)?['teatro dominicano','Dominican theatre']:null;
  if(!noun)continue;
  const isProvince=noun[0]==='provincia dominicana';
  const esTitle=isProvince?'Provincia de '+name.replace(/^Provincia (?:de )?/,''):name;
  prose=[esTitle,s.title,esTitle+' es '+(/^(parque|río|relieve|museo|mercado|acuario|teatro)/.test(noun[0])?'un ':'una ')+noun[0]+'.',s.title+' is '+(/^[aeiou]/.test(noun[1])?'an ':'a ')+noun[1]+'.'];
 }
 if(!prose)continue;
 const title=bilingual(prose[0],prose[1]);
 let key=seedKeys[x.id]||slug(title.es);
 if(plan.some(p=>p.entry.key===key&&p.entry.wikidata!==x.id)||existing.some(c=>c.key===key&&c.wikidata!==x.id))key+='-'+x.id.toLowerCase();
 const url=s.content_urls?.desktop?.page;
 if(!url?.startsWith('https://en.wikipedia.org/wiki/'))continue;
 const source={url,editor:'Wikipedia contributors · English edition',checkedAt:s.checkedAt,httpStatus:200,checkedVia:'https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(x.title),representation:'REST summary of this Wikipedia page'};
 let filename=overrides[x.id]||additionalSeedPhoto[x.id]||claim(e,'P18')[0];
 if(!filename && s.originalimage?.source?.includes('/wikipedia/commons/')){const bits=new URL(s.originalimage.source).pathname.split('/');filename=decodeURIComponent(bits[bits.length-(bits.includes('thumb')?2:1)]).replaceAll('_',' ');}
 if(!filename && s.thumbnail?.source?.includes('/wikipedia/commons/thumb/')){const bits=new URL(s.thumbnail.source).pathname.split('/');filename=decodeURIComponent(bits[bits.length-2]).replaceAll('_',' ');}
 if(!filename)continue;
 const description=bilingual(prose[2],prose[3]);
 const aliases=Object.fromEntries(['es','en'].map(l=>[l,[...new Set([title[l],...(e?.aliases?.[l]||[]).slice(0,6).map(a=>a.value)].flatMap(t=>[t.toLowerCase(),t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()]))]]));
 const entry={key,status:'draft',kind,tags:[kind==='food'?'food':kind==='music'?'music':kind==='craft'?'art':kind==='species'||kind==='nature'?'nature':'history'],wikidata:x.id,province:['food','music','tradition','craft','species'].includes(kind)?'Ámbito nacional':provinceOf(e,all)||'Ámbito nacional o varias provincias',title,aliases,summary:bilingual(prose[2].split(/(?<=\.)\s/)[0],prose[3].split(/(?<=\.)\s/)[0]),description,facts:[{text:{...description},sourceUrl:url}],sources:[source],images:[],reviewNotes:'Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana.'};
 if(sources[x.id])entry.sources.push(sources[x.id]);
 if(['region','nature','museum','place'].includes(kind)){
  const coord=claim(e,'P625').find(c=>c.globe?.endsWith('Q2')&&c.latitude>=17.3&&c.latitude<=20&&c.longitude>=-72.1&&c.longitude<=-68.2);
  if(coord && !/Province/.test(x.title))entry.location={label:title.es,lat:+coord.latitude.toFixed(4),lng:+coord.longitude.toFixed(4),source:'https://www.wikidata.org/wiki/'+x.id};
 }
 if(x.id==='Q5139799'){
  const seed=(await read('preserved-seed.json',[])).find(c=>c.key==='cocolo');const checks=await read('evidence/seed-source-checks.json',[]);
  if(checks.some(c=>c.key==='cocolo'&&c.status===200)){entry.sources.unshift({url:seed.url,editor:seed.editor,checkedAt:date,httpStatus:200});entry.facts=[{text:{...description},sourceUrl:seed.url}];}
 }
 plan.push({entry,filename});
}
await save('topic-plan.json',plan);console.log('TOPIC PLAN',plan.length);
await photoMetadata(plan.map(x=>x.filename));await filePages(plan.map(x=>x.filename));
let candidates=await read('topic-candidates.json',[]),rejects=await read('topic-rejected.json',[]);
for(let start=0;start<plan.length;start+=10){
 for(const {entry,filename} of plan.slice(start,start+10)){
  if(candidates.some(c=>c.wikidata===entry.wikidata))continue;
  try{const media=await materializePhoto(filename,entry.key,entry.title);entry.images=[media.image];candidates.push(entry);console.log('TOPIC ADDED',candidates.length,entry.key);}
  catch(e){rejects=rejects.filter(r=>r.wikidata!==entry.wikidata);rejects.push({key:entry.key,wikidata:entry.wikidata,title:entry.title.es,sourceUrl:entry.sources[0].url,reason:String(e),checkedAt:date});console.log('TOPIC REJECT',entry.key,String(e));}
 }
 await save('topic-candidates.json',candidates);await save('topic-rejected.json',rejects);
 await commitCandidates(candidates,{batch:'topics-'+(start/10+1),checkedAt:new Date().toISOString()});
 console.log('TOPIC BATCH SAVED',start/10+1,candidates.length);
}
