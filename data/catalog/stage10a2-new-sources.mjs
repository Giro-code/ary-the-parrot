import {read,save,request,entities} from './research.mjs';
const titles=await read('stage10a2-new-titles.json',[]);
for(const [key,kind,title] of titles){
 const all=await read('evidence/stage10a2-articles.json',{});if(all[key]?.extract)continue;
 const r=await request('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title));
 const b=r.body;
 all[key]={status:r.status,lang:'en',title:b?.title||title,url:b?.content_urls?.desktop?.page,extract:b?.extract,checkedAt:r.checkedAt,checkedVia:r.url,wikidata:b?.wikibase_item,kind};
 const current=await read('evidence/stage10a2-articles.json',{});current[key]=all[key];await save('evidence/stage10a2-articles.json',current);console.log('NEW SOURCE',key,r.status);
}
const all=await read('evidence/stage10a2-articles.json',{});await entities(titles.map(([k])=>all[k]?.wikidata).filter(Boolean));
