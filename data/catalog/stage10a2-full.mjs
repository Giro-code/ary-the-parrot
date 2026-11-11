import {read,save,request} from './research.mjs';
const keys=process.argv.slice(2);
let all=await read('evidence/stage10a2-articles.json',{});
for(const key of keys){
 const s=all[key];if(!s?.title)continue;
 const lang=s.lang||'en';
 const r=await request('https://'+lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'extracts',explaintext:'1',titles:s.title,redirects:'1'}));
 const p=Object.values(r.body?.query?.pages||{})[0];
 if(r.status===200&&p?.extract){all=await read('evidence/stage10a2-articles.json',{});all[key]={...s,status:200,url:s.url||'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(p.title.replaceAll(' ','_')),extract:p.extract,checkedVia:r.url,checkedAt:r.checkedAt};await save('evidence/stage10a2-articles.json',all);console.log(key+'\n'+p.extract.slice(0,18000));}
}
