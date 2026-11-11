import {read,save,request} from './research.mjs';
const out=await read('evidence/stage10a2-photo-categories.json',{});
const names=['San Rafael Dominican','Los Patos Dominican','Minitas','Cofresi','El Valle Samana','Guayacanes','Bergantin','Esmeralda Miches','Laguna Gri Gri','Museo Gregorio Luperon'];
for(const name of names){
 if(out[name])continue;
 const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',list:'search',srnamespace:'14',srsearch:name,srlimit:'5'}));
 out[name]=(r.body?.query?.search||[]).map(x=>x.title);await save('evidence/stage10a2-photo-categories.json',out);console.log(name,JSON.stringify(out[name]));
}
