import {read,save,request} from './research.mjs';
import {clean} from './media.mjs';
for(const [key,url] of await read(process.argv[2]||'stage10a2-cultural-source-plan.json',[])){
 const r=await request(url,{json:false});if(r.status!==200||typeof r.body!=='string'){console.log('CULTURAL BLOCKED',key,r.status);continue;}
 const main=r.body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const text=clean(main);const all=await read('evidence/stage10a2-articles.json',{});all[key]={status:200,url,editor:url.includes('unesco')?'UNESCO':url.includes('gob.do')?'Ayuntamiento · fuente oficial':'Organizador o Turismo',lang:'es',extract:text,checkedAt:r.checkedAt,checkedVia:url,title:key};await save('evidence/stage10a2-articles.json',all);console.log('CULTURAL SOURCE SAVED',key,text.length);
}
