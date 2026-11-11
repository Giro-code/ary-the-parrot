import {read,save} from './research.mjs';
import {photoMetadata,filePages,materializePhoto} from './media.mjs';
const plan=await read(process.argv[2]||'stage10a2-shortlist-media.json',[]),files=plan.map(x=>x[1]);
await photoMetadata(files);await filePages(files);
for(const [key,file] of plan){
 try{const m=await materializePhoto(file,key,{es:key,en:key});const all=await read('stage10a2-new-media.json',{});all[key]=m;await save('stage10a2-new-media.json',all);console.log('SHORTLIST SAVED',key);}
 catch(e){console.log('SHORTLIST REJECTED',key,String(e));}
}
