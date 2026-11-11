import {request,save,read} from './research.mjs';
let results=await read('evidence/replacement-searches.json',[]);
for(const term of ['"Chicharrón de cerdo"','"Habichuelas con dulce"','"Playa Encuentro"','"Tachycineta euchrysea"','"Plagiodontia aedium"','"Gregorio Luperon" statue','"Salome Ureña"']){
 if(results.some(x=>x.term===term))continue;
 const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',list:'search',srsearch:term,srnamespace:'6',srlimit:'8',format:'json'}));
 const found=r.body?.query?.search||[];results.push({term,status:r.status,found});await save('evidence/replacement-searches.json',results);console.log(term,found.map(x=>x.title).join(' | '));
}
