import {read,save,label,claim,date,request,entities} from './research.mjs';
import {photoMetadata,filePages,materializePhoto} from './media.mjs';
import {slug,provinceOf} from './build-geo.mjs';
const definitions=[
 {id:'Q845457',key:'cigua-palmera',kind:'species',province:'Ámbito nacional',title:{es:'Cigua palmera',en:'Palmchat'},description:{es:'La cigua palmera es un ave propia de La Española. Las palmeras forman parte de sus espacios de alimentación, descanso y nidificación.',en:'The palmchat is a bird native to Hispaniola. Palms form part of its feeding, resting and nesting habitat.'},summaryKey:'Palmchat',filename:'Dulus dominicus.JPG'},
 {id:'Q5815035',key:'dunas-de-bani',kind:'nature',province:'Peravia',title:{es:'Dunas de Baní',en:'Baní Dunes'},description:{es:'Las Dunas de Baní se encuentran en la península de Las Calderas. Su paisaje forma parte del entorno costero de Peravia.',en:'The Baní Dunes are on the Las Calderas Peninsula. Their landscape forms part of the coastal surroundings of Peravia.'},spanishTitle:'Dunas de Baní',filename:'Dunas de Baní 3.jpg'},
 {id:'Q3840823',key:'luperon',kind:'region',province:'Puerto Plata',title:{es:'Luperón',en:'Luperón'},description:{es:'Luperón es un municipio de Puerto Plata, en la República Dominicana.',en:'Luperón is a municipality in Puerto Plata, in the Dominican Republic.'},spanishTitle:'Luperón (República Dominicana)',filename:'Playa grande en luperon - panoramio - Luis A. González Hde….jpg'},
 {id:'Q5858765',key:'feria-internacional-del-libro-de-santo-domingo',kind:'tradition',province:'Distrito Nacional',title:{es:'Feria Internacional del Libro de Santo Domingo',en:'Santo Domingo International Book Fair'},description:{es:'La Feria Internacional del Libro de Santo Domingo es un encuentro cultural dedicado a la lectura y a la cultura escrita. Su organización corresponde al Ministerio de Cultura.',en:'The Santo Domingo International Book Fair is a cultural gathering devoted to reading and written culture. It is organized by the Ministry of Culture.'},spanishTitle:'Feria Internacional del Libro de Santo Domingo',filename:'Inauguración de la XIV Feria Internacional del Libro Santo Domingo 2011.jpg'}
];
let all=await entities(definitions.map(x=>x.id));const summaries=await read('evidence/summaries.json',{}),spanish=await read('evidence/spanish-summaries.json',[]);
// The exact Commons filename from the checked Wikipedia representation is authoritative.
for(const d of definitions){if(d.spanishTitle){const s=spanish.find(x=>x.title===d.spanishTitle);if(s?.originalimage?.source?.includes('/commons/')){const p=new URL(s.originalimage.source).pathname.split('/');d.filename=decodeURIComponent(p[p.length-(p.includes('thumb')?2:1)]).replaceAll('_',' ');}}}
await photoMetadata(definitions.map(d=>d.filename));await filePages(definitions.map(d=>d.filename));
let rows=await read('candidates.json',[]);
for(const d of definitions){
 if(rows.some(c=>c.wikidata===d.id))continue;
 const s=d.spanishTitle?spanish.find(x=>x.title===d.spanishTitle):summaries[d.summaryKey];if(s?.status!==200)continue;
 const source={url:s.content_urls.desktop.page,editor:d.spanishTitle?'Wikipedia · edición española':'Wikipedia · English edition',checkedAt:s.checkedAt,httpStatus:200,checkedVia:'https://'+(d.spanishTitle?'es':'en')+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(d.spanishTitle||d.summaryKey),representation:'REST summary of this Wikipedia page'};
 try{const m=await materializePhoto(d.filename,d.key,d.title);const c={key:d.key,status:'draft',kind:d.kind,tags:[['species','nature'].includes(d.kind)?'nature':d.kind==='tradition'?'art':'history'],wikidata:d.id,province:d.province,title:d.title,aliases:{es:[d.title.es.toLowerCase(),d.title.es.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()],en:[d.title.en.toLowerCase()]},summary:{es:d.description.es.split(/(?<=\.)\s/)[0],en:d.description.en.split(/(?<=\.)\s/)[0]},description:d.description,facts:[{text:d.description,sourceUrl:source.url}],sources:[source],images:[m.image],reviewNotes:'Borrador. Revisar denominación, contexto de la imagen y redacción antes de aprobar. Las fotografías de eventos documentan una edición histórica, sin anunciar un programa actual.'};
 const e=all[d.id];if(['region','nature'].includes(d.kind)){const p=claim(e,'P625').find(c=>c.latitude>=17.3&&c.latitude<=20&&c.longitude>=-72.1&&c.longitude<=-68.2);if(p)c.location={label:d.title.es,lat:+p.latitude.toFixed(4),lng:+p.longitude.toFixed(4),source:'https://www.wikidata.org/wiki/'+d.id};}
 rows.push(c);await save('candidates.json',rows);console.log('FINAL ADDITION',d.key);
 }catch(e){console.log('FINAL ADDITION PENDING',d.key,String(e));}
}
for(const [key,title] of [['qui pe-y-kibbeh'.replace(' ',''),'Quipe'],['ciudad-colonial','Ciudad Colonial']]){
 const r=await request('https://es.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title));const c=rows.find(x=>x.key===key);if(r.status!==200||!c)continue;const s=r.body;
 const source={url:s.content_urls.desktop.page,editor:'Wikipedia · edición española',checkedAt:r.checkedAt,httpStatus:200,checkedVia:r.url,representation:'REST summary of this Wikipedia page'};c.sources.push(source);
 if(key==='ciudad-colonial'&&/UNESCO/.test(s.extract)){c.description={es:'La Ciudad Colonial es el núcleo histórico de Santo Domingo y está reconocida como Patrimonio Mundial de la UNESCO.',en:'The Ciudad Colonial is Santo Domingo’s historic core and is recognized as a UNESCO World Heritage site.'};c.summary={...c.description};c.facts=[{text:c.description,sourceUrl:source.url}];}
 console.log('EXTRA CONTEXT',key,s.extract);
}
await save('candidates.json',rows);
