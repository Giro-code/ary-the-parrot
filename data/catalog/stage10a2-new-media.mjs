import {read,save,entities,claim} from './research.mjs';
import {photoMetadata,filePages,materializePhoto} from './media.mjs';
const sources=await read('evidence/stage10a2-articles.json',{}),rows=await read('candidates.json',[]);
const plan=Object.entries(sources).filter(([k,s])=>s.status===200&&s.wikidata&&!rows.some(c=>c.key===k)&&!k.endsWith('-reference')&&!k.includes('ñ'));
const all=await entities(plan.map(([,s])=>s.wikidata));
const files=plan.map(([k,s])=>claim(all[s.wikidata],'P18')[0]).filter(Boolean);
await photoMetadata(files);await filePages(files);
const output=await read('stage10a2-new-media.json',{}),failures=await read('stage10a2-media-failures.json',{});
for(const [key,s] of plan){
 if(output[key])continue;
 const filename=claim(all[s.wikidata],'P18')[0];if(!filename)continue;
 try{const m=await materializePhoto(filename,key,{es:s.title,en:s.title});output[key]=m;await save('stage10a2-new-media.json',output);console.log('NEW IMAGE SAVED',key,filename);}
 catch(e){failures[key]={filename,reason:String(e)};await save('stage10a2-media-failures.json',failures);console.log('NEW IMAGE REJECTED',key,String(e));}
}
