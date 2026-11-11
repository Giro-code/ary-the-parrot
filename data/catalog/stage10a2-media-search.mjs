import {read,save,request} from './research.mjs';
const searches=await read(process.argv[2]||'stage10a2-media-search-plan.json',[]),output=await read('evidence/stage10a2-media-search.json',{});
for(const [key,query] of searches){
 if(output[key]?.length&&!process.argv[2])continue;
 const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',list:'search',srnamespace:'6',srsearch:query,srlimit:'5'}));
 output[key]=(r.body?.query?.search||[]).map(x=>({title:x.title,pageid:x.pageid,snippet:x.snippet}));await save('evidence/stage10a2-media-search.json',output);console.log('PHOTO SEARCH SAVED',key,output[key].map(x=>x.title).join(' | '));
}
