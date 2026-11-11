import {read,claim} from './research.mjs';
const all=await read('evidence/entities.json',{}),rows=await read('candidates.json',[]),meta=await read('evidence/media.json',{});
console.log('COUNTS',rows.length,Object.keys(meta).length);
if(process.argv[2]==='alternates')for(const id of ['Q2983646','Q1634730','Q549103','Q775394','Q5636855','Q3667736','Q1321816'])console.log(id,claim(all[id],'P18'));
if(process.argv[2]==='spanish')for(const s of await read('evidence/spanish-summaries.json',[]))if(s.status===200)console.log(s.kind,s.wikibase_item,s.title,s.extract,s.originalimage?.source||'');
if(process.argv[2]==='topics')for(const x of await read('topic-plan.json',[]))console.log(x.entry.key,x.entry.wikidata,x.filename);
