import fs from 'node:fs/promises';
import path from 'node:path';
import {read,save,label,claim,ids,data,date,root,request,entities,commitCandidates} from './research.mjs';
import {photoMetadata,materializePhoto,filePages} from './media.mjs';

export const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const bilingual=(es,en)=>({es,en});
export async function sourceIndex(){
 const map={};
 for(const f of await fs.readdir(path.join(data,'evidence/requests'))){
  const r=await read('evidence/requests/'+f,null);
  if(r?.status===200 && r.body?.entities){for(const id of Object.keys(r.body.entities))if(id.startsWith('Q'))map[id]={url:r.url,editor:'Wikidata contributors · entity API',checkedAt:r.checkedAt,httpStatus:200};}
 }
 return map;
}
export const seedKeys={Q2470834:'ciudad-colonial',Q42090:'haitises',Q444485:'altos-chavon',Q9027405:'mangu',Q282131:'merengue',Q40461:'bachata',Q2502146:'larimar',Q898798:'ambar',Q5139799:'cocolo',Q2993007:'congos',Q2037402:'bahia-de-samana',Q132905:'ballenas'};
export function provinceOf(e,all,seen=new Set()){
 if(!e||seen.has(e.id))return null;seen.add(e.id);
 if(ids(e,'P31').includes('Q913337'))return label(e).replace(/^Provincia de /,'').replace(/ \(República Dominicana\)$/,'');
 if(e.id==='Q2499228'||e.id==='Q34820')return 'Distrito Nacional';
 for(const id of ids(e,'P131')){const p=provinceOf(all[id],all,seen);if(p)return p;}
 return null;
}
const typeText={province:['provincia dominicana','Dominican province'],town:['localidad dominicana','Dominican locality'],river:['río de la República Dominicana','river in the Dominican Republic'],island:['isla vinculada al territorio dominicano','island associated with Dominican territory'],beach:['playa dominicana','Dominican beach'],park:['parque nacional dominicano','Dominican national park'],mountain:['formación montañosa de la República Dominicana','mountain formation in the Dominican Republic'],waterfall:['cascada dominicana','Dominican waterfall'],lake:['lago o laguna de la República Dominicana','lake or lagoon in the Dominican Republic'],museum:['museo de la República Dominicana','museum in the Dominican Republic'],church:['edificio religioso de la República Dominicana','religious building in the Dominican Republic'],fort:['fortificación dominicana','Dominican fortification'],theatre:['teatro dominicano','Dominican theatre'],building:['edificio de la República Dominicana','building in the Dominican Republic'],square:['plaza dominicana','Dominican square'],monument:['lugar de patrimonio histórico dominicano','place of Dominican historical heritage']};
const specific={Q286837:['banco oceánico situado al norte de La Española','ocean bank north of Hispaniola'],Q1418401:['paso marítimo entre La Española y Puerto Rico','sea passage between Hispaniola and Puerto Rico'],Q2037402:['bahía dominicana','Dominican bay'],Q2279055:['península del nordeste dominicano','peninsula in the northeastern Dominican Republic'],Q5304337:['jardín botánico de Santo Domingo','botanical garden in Santo Domingo'],Q25404685:['parque urbano de Santo Domingo','urban park in Santo Domingo'],Q24238501:['área protegida de Cabarete','protected area in Cabarete'],Q5969340:['reserva natural dominicana','Dominican nature reserve'],Q6062972:['cueva de la República Dominicana','cave in the Dominican Republic'],Q104184947:['museo de Santo Domingo','museum in Santo Domingo'],Q7301193:['conjunto de antiguos almacenes de Santo Domingo','historic warehouse complex in Santo Domingo'],Q444485:['conjunto arquitectónico de La Romana','architectural complex in La Romana'],Q770641:['estadio de Santo Domingo','stadium in Santo Domingo'],Q5062863:['complejo deportivo de Santo Domingo','sports complex in Santo Domingo'],Q5400137:['estadio de béisbol de Santiago','baseball stadium in Santiago'],Q5400308:['estadio de béisbol de San Francisco de Macorís','baseball stadium in San Francisco de Macorís'],Q5400466:['estadio de béisbol de Santo Domingo','baseball stadium in Santo Domingo'],Q5400511:['estadio de béisbol de San Pedro de Macorís','baseball stadium in San Pedro de Macorís'],Q20922039:['archivo nacional dominicano','Dominican national archive'],Q25277:['isla compartida por la República Dominicana y Haití','island shared by the Dominican Republic and Haiti'],Q668772:['palacio histórico de Santo Domingo','historic palace in Santo Domingo'],Q106960254:['casa histórica de Santo Domingo','historic house in Santo Domingo'],Q65123094:['sitio histórico de La Vega','historic site in La Vega'],Q65123142:['centro histórico de Puerto Plata','historic centre of Puerto Plata']};
const alternativeTitles={Q122222880:['Catedral Nuestra Señora de Regla','Cathedral of Our Lady of the Rule'],Q123048464:['Catedral San Juan Bautista','Cathedral of St. John the Baptist'],Q123048468:['Catedral San Pedro Apóstol','Cathedral of St. Peter the Apostle'],Q123048480:['Catedral Santa Ana','Cathedral of St. Ann'],Q125071301:['Playa Arena Gorda','Arena Gorda Beach'],Q125071518:['27 Charcos de Damajagua','27 Waterfalls of Damajagua'],Q125072226:['Playa Frontón','Frontón Beach'],Q125072833:['Playa Cabarete','Cabarete Beach'],Q125131312:['Playa Bayahíbe','Bayahíbe Beach'],Q125131988:['Playa Bávaro','Bávaro Beach'],Q1321816:['Playa Encuentro','Encuentro Beach'],Q5994389:['Río Higuamo','Higuamo River'],Q6167460:['Río Jayaco','Jayaco River'],Q7553040:['Río Soco','Soco River'],Q8061044:['Río Yuma','Yuma River'],Q65123094:['La Vega Vieja','La Vega Vieja'],Q65123142:['Centro histórico de Puerto Plata','Historic Centre of Puerto Plata'],Q115430915:['Obelisco de Santo Domingo','Santo Domingo Obelisk']};

typeText.street=['calle histórica de Santo Domingo','historic street in Santo Domingo'];
typeText.bridge=['puente de la República Dominicana','bridge in the Dominican Republic'];
typeText.dam=['presa de la República Dominicana','dam in the Dominican Republic'];
typeText.transport=['sistema de transporte de Santo Domingo','transport system in Santo Domingo'];

if(process.argv[2]==='run'){
 let all=await read('evidence/entities.json',{}), plan=await read('geo-plan.json',[]);const overrides=await read('image-overrides.json',{});
 plan=plan.filter(x=>x.id!=='Q7065415');
 const sources=await sourceIndex();
 let candidates=await read('candidates.json',[]),rejected=await read('rejected.json',[]),progress=await read('batches.json',[]);
 const files=plan.flatMap(x=>overrides[x.id]?[overrides[x.id]]:claim(all[x.id],'P18').slice(0,1));
 await photoMetadata(files);
 await filePages(files);
 for(let start=0;start<plan.length;start+=10){
  let added=0;
  for(const x of plan.slice(start,start+10)){
   const e=all[x.id]; if(candidates.some(c=>c.wikidata===x.id))continue;
   const names=alternativeTitles[x.id]||[label(e),label(e,'en')];
   const title=bilingual(...names); if(x.type==='province'){title.es='Provincia de '+title.es.replace(/^Provincia de /,'').replace(/ \(República Dominicana\)$/,'');title.en=title.en.includes('Province')?title.en:title.en+' Province';}
   let key=seedKeys[x.id]||slug(title.es);if(candidates.some(c=>c.key===key))key+='-'+x.id.toLowerCase();
   const typ=specific[x.id]||typeText[x.type];
   if(!typ||!sources[x.id]){rejected.push({key,wikidata:x.id,title:title.es,reason:'No reproducible entity source or approved content type',checkedAt:date});continue;}
   const p=provinceOf(e,all)||'Ámbito nacional o varias provincias';
   const summary=bilingual(title.es+' es '+(/^[aeiouáéíóú]/i.test(typ[0])?'una ':'una ')+typ[0]+'.',title.en+' is '+(/^[aeiou]/i.test(typ[1])?'an ':'a ')+typ[1]+'.');
   // Spanish grammatical gender follows the approved noun, not the proper name.
   summary.es=title.es+' es '+(/^(río|parque|museo|edificio|teatro|lago|lugar|banco|paso|jardín|conjunto|complejo|estadio|archivo|palacio|sitio|centro)/.test(typ[0])?'un ':'una ')+typ[0]+'.';
   const description={...summary};
   if(!p.startsWith('Ámbito')&&x.type!=='province'){description.es+=' Su ubicación está vinculada a '+p+'.';description.en+=' Its location is associated with '+p+'.';}
   const aliases=Object.fromEntries(['es','en'].map(l=>[l,[...new Set([title[l],...(e.aliases?.[l]||[]).slice(0,5).map(a=>a.value)].flatMap(s=>[s.toLowerCase(),s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()]))]]));
   const kind=x.type==='province'||x.type==='town'?'region':['river','island','park','mountain','waterfall','lake','cave'].includes(x.type)?'nature':x.type==='beach'?'beach':x.type==='museum'?'museum':'place';
   try{
    const media=await materializePhoto(overrides[x.id]||claim(e,'P18')[0],key,title);
    const entry={key,status:'draft',kind,tags:[['nature','beach'].includes(kind)?'nature':x.type==='theatre'?'art':'history'],wikidata:x.id,province:p,title,aliases,summary,description,facts:[{text:{...description},sourceUrl:sources[x.id].url}],sources:[sources[x.id]],images:[media.image],reviewNotes:'Borrador. Comprobar denominación local y utilidad para el visitante. Texto mínimo derivado de la entidad Wikidata; no implica acceso público. La foto P18 debe revisarse visualmente antes de aprobar.'};
    const coord=claim(e,'P625').find(c=>c.globe?.endsWith('Q2')&&c.latitude>=17.3&&c.latitude<=20&&c.longitude>=-72.1&&c.longitude<=-68.2);
    if(coord && x.type!=='province' && !['Q25277'].includes(x.id))entry.location={label:title.es,lat:+coord.latitude.toFixed(4),lng:+coord.longitude.toFixed(4),source:'https://www.wikidata.org/wiki/'+x.id};
    candidates.push(entry);added++;console.log('ADDED',candidates.length,key);
   }catch(error){rejected=rejected.filter(r=>r.wikidata!==x.id);rejected.push({key,wikidata:x.id,title:title.es,reason:String(error),sourceUrl:'https://www.wikidata.org/wiki/'+x.id,checkedAt:date});console.log('REJECT',key,String(error));}
  }
  progress.push({batch:'geo-'+(start/10+1),checkedAt:new Date().toISOString(),added,total:candidates.length});
  candidates=await commitCandidates(candidates,{batch:'geo-'+(start/10+1),checkedAt:new Date().toISOString(),added});await save('rejected.json',rejected);
  console.log('BATCH SAVED',start/10+1,candidates.length);
 }
}
