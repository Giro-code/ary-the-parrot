import {request,save,read} from './research.mjs';
let results=await read('evidence/final-searches.json',[]);
for(const term of ['"Gran Teatro del Cibao"','"Sierra de Bahoruco"','"Hispaniolan euphonia"','"Chlorophonia musica"','"Rio Ozama"','"catibias"']){
 if(results.some(x=>x.term===term))continue;
 const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',list:'search',srsearch:term,srnamespace:'6',srlimit:'7',format:'json'}));
 const found=r.body?.query?.search||[];results.push({term,status:r.status,found});await save('evidence/final-searches.json',results);console.log(term,found.map(x=>x.title).join(' | '));
}
