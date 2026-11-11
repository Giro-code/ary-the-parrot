import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {data,read,save} from './research.mjs';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
function compact(value){
 if(Array.isArray(value))return value.map(compact);
 if(!value||typeof value!=='object')return value;
 const out={};for(const [k,v] of Object.entries(value)){
  if(['extract','wikitext','snippet','description','ImageDescription'].includes(k)&&typeof v==='string'){out[k+'Sha256']=hash(v);continue;}
  if(k==='descriptions'){out.descriptionsSha256=hash(JSON.stringify(v));continue;}
  if(k==='body'&&typeof v==='string'){out.body={contentSha256:hash(v),characters:v.length,contentOmitted:true};out.contentOmitted=true;continue;}
  if(k==='*'&&typeof v==='string'){out.contentSha256=hash(v);out.licenseTemplates=[...new Set(v.match(/cc-by(?:-sa)?-[\d.]+(?:-[a-z]+)?|cc-by-sa-all|cc-zero|pd-[a-z0-9-]+|gfdl[a-z0-9-]*|migration\s*=\s*relicense/gi)||[])];continue;}
  if(k==='extmetadata'){out.extmetadata=Object.fromEntries(Object.entries(v).filter(([key])=>['Artist','LicenseShortName','LicenseUrl','License','AttributionRequired','Copyrighted','DateTimeOriginal','Restrictions'].includes(key)));out.contentOmitted=true;continue;}
  out[k]=compact(v);
 }return out;
}
const pages=await read('evidence/file-pages.json',{});
for(const page of Object.values(pages))if(page.wikitext){const text=page.wikitext;page.contentSha256=hash(text);page.characters=text.length;page.licenseTemplates=[...new Set(text.match(/cc-by(?:-sa)?-[\d.]+(?:-[a-z]+)?|cc-by-sa-all|cc-zero|pd-[a-z0-9-]+|gfdl[a-z0-9-]*|migration\s*=\s*relicense/gi)||[])];delete page.wikitext;}
await save('evidence/file-pages.json',pages);
for(const name of await fs.readdir(path.join(data,'evidence/requests'))){const key='evidence/requests/'+name;const r=await read(key,null);if(!r)continue;const result=compact(r);result.contentOmitted=true;await save(key,result);}
for(const name of ['evidence/entities.json','evidence/summaries.json','evidence/spanish-summaries.json','evidence/media-metadata.json','evidence/media.json','evidence/extra-search.json','evidence/replacement-searches.json','evidence/final-searches.json']){const value=await read(name,null);if(value)await save(name,compact(value));}
for(const [name,index] of [['discovery.tsv',2],['geo.tsv',2],['endemic.tsv',2],['topics.tsv',4]]){
 try{const text=await fs.readFile(path.join(data,name),'utf8');await fs.writeFile(path.join(data,name),text.split('\n').filter(Boolean).map(line=>line.split('\t').filter((_,i)=>i!==index).join('\t')).join('\n')+'\n','utf8');}catch{}
}
const topics=await read('topic-resolved.json',[]),summaries=await read('evidence/summaries.json',{});
await fs.writeFile(path.join(data,'context.tsv'),topics.map(x=>[x.kind,x.id||'',x.title,summaries[x.title]?.content_urls?.desktop?.page||'',summaries[x.title]?.extractSha256||''].join('\t')).join('\n')+'\n','utf8');
console.log('EVIDENCE COMPACTED: source IDs, response hashes, HTTP results, license templates and metadata retained; article paragraphs omitted.');
