import {read,save} from './research.mjs';
const specs=await read('stage10a2-new-specs.json',[]);
function spec(row){const i=specs.findIndex(x=>x[0]===row[0]);if(i<0)specs.push(row);else specs[i]=row;}
spec(['eduardo-brito','person','Eduardo Brito','Eduardo Brito','teatro-nacional-eduardo-brito','Ámbito nacional','Imagen contextual del Teatro Nacional que lleva su nombre; no es un retrato del cantante.']);
spec(['pintura-dominicana','craft','Pintura dominicana','Dominican painting','museo-del-hombre-dominicano','Ámbito nacional','Imagen contextual de un recinto cultural de la Plaza de la Cultura; no reproduce una pintura.','art-reference']);
spec(['artesania-miches','craft','Artesanía de Miches','Miches crafts','santa-cruz-de-el-seibo','El Seibo','Foto contextual de la provincia de El Seibo; no muestra una pieza artesanal.','workshop-miches-reference']);
spec(['tabaco-santiago','craft','Artesanía del tabaco de Santiago','Santiago cigar craftsmanship','santiago-de-los-caballeros','Santiago','Foto contextual de Santiago; no muestra una fábrica ni promueve el consumo.','cigar-reference']);
await save('stage10a2-new-specs.json',specs);
let rows=await read('candidates.json',[]);
// Correct classifications: an archaeological settlement and a house museum.
rows.find(x=>x.key==='la-vega-vieja').kind='place';
const house=rows.find(x=>x.key==='casa-de-tostado');house.kind='museum';
const sources=await read('evidence/stage10a2-articles.json',{});sources['casa-de-tostado']=sources['museo-familia-dominicana'];await save('evidence/stage10a2-articles.json',sources);
const thin=rows.filter(x=>!x.enrichmentBatch&&!['laguna-de-oviedo','playa-punta-rucia','estadio-tetelo-vargas','fortaleza-de-san-felipe','fortaleza-san-luis','monasterio-de-san-francisco','casona-de-palave','catedral-san-pedro-apostol','parque-mirador-sur-santo-domingo','museo-de-las-atarazanas-reales','iglesia-regina-angelorum','laguna-el-dudu','playa-bavaro','la-vega-vieja','casa-de-tostado','playa-alicia'].includes(x.key));
const rejected=await read('rejected.json',[]);
for(const c of thin)if(!rejected.some(r=>r.key===c.key&&r.stage==='10A2'))rejected.push({key:c.key,title:c.title,wikidata:c.wikidata,stage:'10A2',reason:'thin_source',detail:'La fuente disponible es breve, inespecífica o redirige a un índice; no permite dos frases útiles verificadas sobre esta entidad.',previousSources:c.sources});
await save('rejected.json',rejected);rows=rows.filter(x=>!thin.includes(x));await save('candidates.json',rows);
const batches=await read('batches.json',[]);batches.push({batch:'stage10a2-resume-source-triage',stage:'10A2',checkedAt:new Date().toISOString(),rejected:thin.map(x=>x.key),total:rows.length});await save('batches.json',batches);
console.log('Source triage saved',rows.length,'rejected',thin.length);
