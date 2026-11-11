import {request,save} from './research.mjs';
for(const suffix of ['sitemap/things-to-do.xml','sitemap/travel.xml','sitemap/blogs.xml']){
const r=await request('https://www.godominicanrepublic.com/'+suffix,{json:false});console.log(r.status,r.body?.slice(0,500));if(typeof r.body==='string'){
 const urls=[...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);await save('stage10a2-'+suffix.replaceAll('/','-')+'.json',urls);console.log(urls.length,urls.filter(u=>/museum|playa|beach|festival|carnival|carnaval|whale|cacao|coffee|raft|kayak/.test(u)).join('\n'));
}}
