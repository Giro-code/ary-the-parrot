import {request,read,save} from './research.mjs';
for(const [key,title] of [['cuisine-reference','Dominican Republic cuisine'],['culture-reference','Culture of the Dominican Republic'],['carnival-reference','Dominican Carnival'],['music-reference','Music of the Dominican Republic'],['art-reference','Dominican art']]){
 const r=await request('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'extracts',explaintext:'1',titles:title,redirects:'1'}));
 const p=Object.values(r.body?.query?.pages||{})[0];if(r.status!==200||!p?.extract)continue;
 const all=await read('evidence/stage10a2-articles.json',{});all[key]={status:200,title:p.title,lang:'en',url:'https://en.wikipedia.org/wiki/'+encodeURIComponent(p.title.replaceAll(' ','_')),extract:p.extract,checkedAt:r.checkedAt,checkedVia:r.url};await save('evidence/stage10a2-articles.json',all);console.log('TOPIC SAVED',key,p.extract.length);
}
