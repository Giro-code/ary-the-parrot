import fs from 'node:fs/promises';
import {read,save,request} from './research.mjs';

// Re-runnable collection only. Does not turn unreviewed sources into candidates.
const rows=await read('candidates.json',[]), entities=await read('evidence/entities.json',{});
if(!await read('stage10a2-original.json',null)) await save('stage10a2-original.json',rows);
const regions=new Set('san-cristobal cabarete la-vega samana san-pedro-de-macoris boca-chica constanza-republica-dominicana san-francisco-de-macoris santa-cruz-de-barahona higuey salcedo bayahibe moca punta-cana sabana-de-la-mar las-terrenas municipio-de-azua bani dajabon san-jose-de-ocoa monte-cristi nagua hato-mayor san-juan pedernales las-galeras monte-plata cotui neiba san-jose-de-las-matas la-romana santiago-de-los-caballeros puerto-plata jarabacoa bonao santo-domingo luperon'.split(' '));
const species=new Set('cotorra-de-la-espanola solenodonte-de-la-espanola cigua-palmera ballenas cyclura-cornuta cyclura-ricordii leuenbergeria-quisqueyana swietenia-mahagoni cocodrilo-de-tumbes pinus-occidentalis priotelus-roseigaster todus-subulatus melanerpes-striatus aratinga-de-la-espanola'.split(' '));
const plan=rows.filter(c=>c.kind==='region'?regions.has(c.key):c.kind==='species'?species.has(c.key):true).map(c=>{
 const e=entities[c.wikidata];const lang=e?.sitelinks?.enwiki?'en':'es',title=e?.sitelinks?.[lang+'wiki']?.title;
 return {key:c.key,lang,title};
});
await save('stage10a2-plan.json',plan);
let sources=await read('evidence/stage10a2-articles.json',{});
for(const p of plan){
 if(!p.title||sources[p.key]?.extract)continue;
 const r=await request('https://'+p.lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(p.title));
 if(r.status===200&&r.body?.extract)sources[p.key]={status:200,url:r.body.content_urls?.desktop?.page,lang:p.lang,title:r.body.title,extract:r.body.extract,checkedAt:r.checkedAt,checkedVia:r.url,wikidata:r.body.wikibase_item};
 else sources[p.key]={status:r.status,title:p.title,checkedVia:r.url};
 const current=await read('evidence/stage10a2-articles.json',{});current[p.key]=sources[p.key];sources=current;await save('evidence/stage10a2-articles.json',sources);
 console.log('ARTICLE SAVED',p.key,r.status);
}
