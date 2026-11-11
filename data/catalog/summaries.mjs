import {topics} from './topics.mjs';
import {request,read,save,entities,data} from './research.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
let resolved=await read('topic-resolved.json',[]), summaries=await read('evidence/summaries.json',{});
for(const x of resolved){
 if([200,404,403].includes(summaries[x.title]?.status)) continue;
 const r=await request('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(x.title));
 summaries[x.title]={status:r.status,checkedAt:r.checkedAt,...(typeof r.body==='object'?r.body:{})};
 if(r.body?.wikibase_item)x.id=r.body.wikibase_item;
 await save('evidence/summaries.json',summaries);await save('topic-resolved.json',resolved);
 console.log('SUMMARY',Object.keys(summaries).length,resolved.length,x.title,r.status);
}
await entities(resolved.map(x=>x.id).filter(Boolean));
await fs.writeFile(path.join(data,'context.tsv'),resolved.map(x=>[x.kind,x.id||'MISSING',x.title,summaries[x.title]?.extract||''].join('\t')).join('\n')+'\n','utf8');
