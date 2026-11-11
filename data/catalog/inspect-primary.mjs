import fs from 'node:fs/promises';
import path from 'node:path';
import {data,read} from './research.mjs';
import {clean} from './media.mjs';
const urls=new Map((await read('preserved-seed.json',[])).map(x=>[x.url,x.key]));
for(const f of await fs.readdir(path.join(data,'evidence/requests'))){
 const r=await read('evidence/requests/'+f,null);if(!urls.has(r?.url)||r.status!==200)continue;
 const s=clean(r.body);const terms={mangu:'mang',merengue:'transmi',bachata:'guitar',cocolo:'British',congos:'Brotherhood',larimar:'pectol',haitises:'mang',ballenas:'Saman',carnaval:'Diablo','altos-chavon':'Mediterr'};
 const key=urls.get(r.url),match=s.toLowerCase().indexOf(terms[key]?.toLowerCase());console.log(key,'chars',s.length,'match',match,s.slice(Math.max(0,match-80),Math.max(0,match-80)+1100));
}
