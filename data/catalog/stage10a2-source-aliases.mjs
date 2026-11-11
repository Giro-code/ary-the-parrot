import {read,save} from './research.mjs';
const all=await read('evidence/stage10a2-articles.json',{});
// Context sources are explicit; never assign the context entity's QID to a new subject.
for(const [key,from] of [['carnaval','la-vega'],['museo-de-las-atarazanas-reales','reales-atarazanas-de-santo-domingo']])if(all[from]?.extract)all[key]={...all[from],wikidata:undefined};
await save('evidence/stage10a2-articles.json',all);
