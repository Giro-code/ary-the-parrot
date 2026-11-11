import {read,save,date} from './research.mjs';
const batch=process.argv[2];
if(!batch)throw Error('Provide an authored batch JSON name');
const authored=await read(batch,null);if(!authored)throw Error('Missing authored batch');
const sources=await read('evidence/stage10a2-articles.json',{});
let rows=await read('candidates.json',[]);
const specs=await read('stage10a2-new-specs.json',[]),newMedia=await read('stage10a2-new-media.json',{}),original=await read('stage10a2-original.json',[]);
for(const [key,es1,es2,en1,en2] of authored){
 let c=rows.find(c=>c.key===key);const spec=specs.find(x=>x[0]===key);const s=sources[spec?.[7]||key];
 if(!c&&spec){const [,kind,es,en,imageFrom,province,notes,sourceKey]=spec;const im=newMedia[imageFrom||key]?.image||original.find(x=>x.key===imageFrom)?.images?.[0]||rows.find(x=>x.key===imageFrom)?.images?.[0];if(!im)throw Error('Missing licensed image for '+key);
 c={key,status:'draft',kind,tags:[['food','music','nature'].includes(kind)?kind:kind==='beach'?'nature':kind==='experience'?'adventure':kind==='craft'?'art':'history'],wikidata:sourceKey?null:s?.wikidata||null,province:province||'Ámbito nacional',title:{es,en},aliases:{es:[es.toLowerCase()],en:[en.toLowerCase()]},images:[structuredClone(im)]};
 const ingredients={'ingredient-orange-juice':['jugo de naranja','orange juice'],'ingredient-yuca':['raíz de yuca','cassava root'],'ingredient-corn':['harina de maíz','cornmeal'],'ingredient-coconut':['coco rallado','grated coconut'],'ingredient-rice':['arroz blanco','white rice'],'ingredient-coffee':['granos de café tostados','roasted coffee beans']};
 c.images[0].alt={es:ingredients[imageFrom]?'Ingrediente ilustrativo: '+ingredients[imageFrom][0]+'; no muestra el plato terminado':imageFrom?'Imagen contextual: '+(original.find(x=>x.key===imageFrom)?.title.es||imageFrom):'Imagen histórica o de referencia de '+es,en:ingredients[imageFrom]?'Illustrative ingredient: '+ingredients[imageFrom][1]+'; not the finished dish':imageFrom?'Context image: '+(original.find(x=>x.key===imageFrom)?.title.en||imageFrom):'Historical or reference image of '+en};rows.push(c);
 }
 if(!c||s?.status!==200||!s.url||!s.extract)throw Error('Missing candidate or reviewed source: '+key);
 c.description={es:es1+' '+es2,en:en1+' '+en2};
 for(const l of ['es','en'])if(c.description[l].length<140)throw Error('Description under 140 characters: '+key+' '+l);
 c.summary={es:es1,en:en1};
 for(const l of ['es','en'])if(c.summary[l].length>160)throw Error('Summary over 160 characters: '+key+' '+l);
 c.facts=[{text:{es:es1,en:en1},sourceUrl:s.url},{text:{es:es2,en:en2},sourceUrl:s.url}];
 c.sources=[{url:s.url,editor:s.editor||(s.lang==='es'?'Wikipedia · artículo en español':'Wikipedia · English article'),checkedAt:s.checkedAt,httpStatus:200,checkedVia:s.checkedVia},...(c.wikidata?[{url:'https://www.wikidata.org/wiki/'+c.wikidata,editor:'Wikidata · coordenadas e imagen',checkedAt:date,httpStatus:200}]:[])];
 for(const l of ['es','en'])c.aliases[l]=[...new Set([...c.aliases[l],c.title[l].toLowerCase(),c.title[l].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()])];
 c.reviewNotes='Etapa 10A2: redacción propia contrastada con el artículo citado. Borrador pendiente de aprobación humana.'+(c.kind==='food'?' Foto ilustrativa: no acredita una receta o un establecimiento concreto.':'')+(spec?.[6]?' '+spec[6]:'');
 c.enrichmentBatch=batch;
}
await save('candidates.json',rows);
const batches=await read('batches.json',[]);batches.push({batch,stage:'10A2',checkedAt:new Date().toISOString(),enriched:authored.length,total:rows.length});await save('batches.json',batches);
console.log('BATCH SAVED',batch,authored.length);
