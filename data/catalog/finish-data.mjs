import {read,save,entities,ids,date} from './research.mjs';
let rows=await read('candidates.json',[]);const all=await entities(['Q9259']);
const colonial=rows.find(c=>c.key==='ciudad-colonial'),entity=all.Q2470834;
if(ids(entity,'P1435').includes('Q9259')&&all.Q9259?.labels?.en?.value?.toLowerCase().includes('world heritage')){
 const wiki=colonial.sources.find(s=>s.url.startsWith('https://es.wikipedia.org/wiki/'));
 const wd=colonial.sources.find(s=>s.url.startsWith('https://www.wikidata.org/w/api.php'));
 if(wiki&&wd){const a={es:'La Ciudad Colonial es el núcleo histórico de Santo Domingo, capital dominicana.',en:'The Ciudad Colonial is the historic core of Santo Domingo, the Dominican capital.'},b={es:'La UNESCO reconoce este conjunto como Patrimonio Mundial.',en:'UNESCO recognizes this district as a World Heritage Site.'};colonial.summary=a;colonial.description={es:a.es+' '+b.es,en:a.en+' '+b.en};colonial.facts=[{text:a,sourceUrl:wiki.url},{text:b,sourceUrl:wd.url}];}
}
for(const c of rows)for(const l of ['es','en'])c.aliases[l]=[...new Set(c.aliases[l])];
const p=rows.find(c=>c.key==='pico-duarte');if(p){const text={es:'El Pico Duarte es la cumbre más alta de La Española.',en:'Pico Duarte is the highest summit on Hispaniola.'};p.summary=text;p.description=text;p.facts=[{text,sourceUrl:p.sources[0].url}];}
const reviewAlts={
 'chicharron':{es:'Plato boliviano de chicharrón de cerdo; imagen ilustrativa del alimento',en:'A Bolivian pork chicharrón dish; an illustrative image of the food'},
 'gran-teatro-del-cibao':{es:'Escultura de Lope de Vega en el Gran Teatro del Cibao; imagen contextual del complejo',en:'Sculpture of Lope de Vega at the Gran Teatro del Cibao; a contextual image of the complex'},
 'sierra-de-bahoruco':{es:'Hoyo de Pelempito en la Sierra de Bahoruco',en:'Hoyo de Pelempito in the Sierra de Bahoruco'},
 'parque-nacional-sierra-de-bahoruco':{es:'Paisaje de Hoyo de Pelempito en el Parque Nacional Sierra de Bahoruco',en:'Landscape of Hoyo de Pelempito in Sierra de Bahoruco National Park'}
};
for(const c of rows)if(reviewAlts[c.key])c.images[0].alt=reviewAlts[c.key];
let media=await read('evidence/media.json',{});for(const c of rows)if(media[c.key])media[c.key].image=c.images[0];await save('evidence/media.json',media);
await save('candidates.json',rows);
const previous=[...(await read('rejected.json',[])),...(await read('topic-rejected.json',[]))],recovered=[],rejectMap=new Map();
for(const r of previous){if(rows.some(c=>(r.wikidata&&c.wikidata===r.wikidata)||c.key===r.key)){recovered.push(r);continue;}rejectMap.set(r.wikidata||r.key||r.title,r);}
const actions=await read('photo-review.json',{});for(const [key,a] of Object.entries(actions))if(a.action==='reject'){const existing=rejectMap.get(key)||{};rejectMap.set(key,{...existing,key,reason:a.reason,checkedAt:date,blockedForReview:true});}
rejectMap.set('feria-internacional-del-libro-de-santo-domingo',{key:'feria-internacional-del-libro-de-santo-domingo',wikidata:'Q5858765',title:'Feria Internacional del Libro de Santo Domingo',reason:'La fotografía encontrada usa FAL, fuera de las licencias autorizadas para esta entrega.',checkedAt:date});
await save('rejected.json',[...rejectMap.values()]);await save('evidence/recovered-incidents.json',recovered);
const topicIds=new Set((await read('topic-candidates.json',[])).map(c=>c.wikidata));await save('topic-candidates.json',rows.filter(c=>topicIds.has(c.wikidata)));
const batches=await read('batches.json',[]);batches.push({batch:'final-curation',checkedAt:new Date().toISOString(),total:rows.length});await save('batches.json',batches);console.log('CURATED',rows.length,'REJECTED',rejectMap.size);
