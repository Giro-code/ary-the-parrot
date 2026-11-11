import {read,save} from './research.mjs';
const rows=await read('candidates.json',[]),ids=new Set(rows.map(c=>c.wikidata).filter(Boolean));
await save('topic-candidates.json',(await read('topic-candidates.json',[])).filter(c=>ids.has(c.wikidata)).map(c=>rows.find(r=>r.wikidata===c.wikidata)));
const rejected=await read('rejected.json',[]),actions=await read('photo-review.json',{});
for(const [key,a] of Object.entries(actions))if(a.action==='reject'&&!rejected.some(r=>r.key===key))rejected.push({key,reason:a.reason,checkedAt:new Date().toISOString().slice(0,10),blockedForReview:true});
await save('rejected.json',rejected);
const batches=await read('batches.json',[]);batches.push({batch:'final-visual-corrections',checkedAt:new Date().toISOString(),total:rows.length});await save('batches.json',batches);console.log('FINAL BATCH',rows.length,'drafts',rejected.length,'exclusions');
