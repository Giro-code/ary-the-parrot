import {request,save} from './research.mjs';
const r=await request('https://www.godominicanrepublic.com/things-to-do/all-activities',{json:false});
console.log(r.status,typeof r.body,r.body?.length);
if(typeof r.body==='string'){
 const urls=[...new Set([...r.body.matchAll(/href="([^"]+)"/g)].map(x=>x[1]))].filter(x=>/listing|things-to-do|events/.test(x));
 await save('stage10a2-official-links.json',urls);console.log(urls.join('\n'));
}
