import {request,save} from './research.mjs';
const found=[];
for(const search of ['"Villa Mella" -Limbiate','"Congos" "Dominican"','"Mata Los Indios"','"Carnaval de La Vega"']){
 const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',list:'search',srsearch:search,srnamespace:'6',srlimit:'12',format:'json'}));
 found.push({search,status:r.status,results:r.body?.query?.search||[]});console.log(search,JSON.stringify(r.body?.query?.search||r.body?.error));
}
const r=await request('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbsearchentities',search:'Carnaval de La Vega',language:'es',limit:'5',format:'json'}));console.log('CARNAVAL Q',JSON.stringify(r.body?.search));
await save('evidence/extra-search.json',{found,carnaval:r.body?.search});
