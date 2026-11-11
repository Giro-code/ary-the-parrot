import {read,save} from './research.mjs';
const rows=await read('candidates.json',[]),plan=await read('stage10a2-plan.json',[]),keep=new Set(plan.map(p=>p.key));
const rejected=await read('rejected.json',[]),merges=await read('stage10a2-merges.json',[]);
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^(provincia de |municipio de )/,'').replace(/ \(.*\)/,'');
const retained=rows.filter(c=>keep.has(c.key));
for(const c of rows.filter(c=>!keep.has(c.key))){
 const match=c.kind==='region'?retained.find(r=>r.kind==='region'&&norm(r.title.es)===norm(c.title.es)):null;
 if(match){for(const l of ['es','en'])match.aliases[l]=[...new Set([...match.aliases[l],...c.aliases[l]])];merges.push({from:c.key,to:match.key,reason:'Ciudad y provincia homónimas: conservar una ficha de destino.'});}
 rejected.push({key:c.key,wikidata:c.wikidata,title:c.title.es,reason:match?'merged_duplicate':c.kind==='species'?'species_balance':'no_clear_tourist_interest',stage:'10A2',mergedInto:match?.key,detail:match?'Se conserva el destino urbano homónimo.':c.kind==='species'?'Selección limitada de especies emblemáticas para equilibrar el catálogo.':'Ficha administrativa sin atractivo turístico concreto acreditado en el texto existente.',checkedAt:new Date().toISOString()});
}
await save('candidates.json',retained);await save('rejected.json',rejected);await save('stage10a2-merges.json',merges);
const batches=await read('batches.json',[]);batches.push({batch:'10A2-balance',total:retained.length,removed:rows.length-retained.length,checkedAt:new Date().toISOString()});await save('batches.json',batches);
console.log('BALANCED',retained.length,'removed',rows.length-retained.length,'merges',merges.length);
