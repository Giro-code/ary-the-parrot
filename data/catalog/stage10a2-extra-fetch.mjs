import {read,save,request} from './research.mjs';
for(const [key,lang,title] of await read(process.argv[2]||'stage10a2-extra-titles.json',[])){
 const r=await request('https://'+lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'extracts|pageprops',explaintext:'1',titles:title,redirects:'1'}));
 const p=Object.values(r.body?.query?.pages||{})[0];if(!p?.extract||p.pageprops?.disambiguation!==undefined){console.log('NO ARTICLE',key,r.status);continue;}
 const all=await read('evidence/stage10a2-articles.json',{});all[key]={status:200,title:p.title,lang,url:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(p.title.replaceAll(' ','_')),extract:p.extract,checkedAt:r.checkedAt,checkedVia:r.url,wikidata:p.pageprops?.wikibase_item};await save('evidence/stage10a2-articles.json',all);console.log('FULL SAVED',key,p.extract.length);
}
