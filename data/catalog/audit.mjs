import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,data,read,save} from './research.mjs';
const rows=await read('candidates.json',[]),media=await read('evidence/media.json',{}),pages=await read('evidence/file-pages.json',{}),metadata=await read('evidence/media-metadata.json',{}),requests=new Map();
for(const f of await fs.readdir(path.join(data,'evidence/requests'))){const r=await read('evidence/requests/'+f,null);if(r)requests.set(r.url,r);}
const errors=[],checks=[];
for(const c of rows){
 for(const s of c.sources){const r=requests.get(s.checkedVia||s.url);if(r?.status!==200)errors.push(c.key+': source response not preserved '+s.url);if(s.checkedVia&&r?.body?.content_urls?.desktop?.page!==s.url)errors.push(c.key+': REST source does not identify the cited page');}
 const m=media[c.key];if(!m){errors.push(c.key+': image audit record missing');continue;}
 for(const im of c.images){
  if(im.sourceUrl!==m.image.sourceUrl||im.author!==m.image.author||im.license!==m.image.license||im.licenseUrl!==m.image.licenseUrl)errors.push(c.key+': candidate attribution differs from checked image');
  const file=await fs.readFile(path.join(root,'public',im.file)).catch(()=>null);if(!file){errors.push(c.key+': missing image');continue;}
  if(crypto.createHash('sha256').update(file).digest('hex')!==m.sha256)errors.push(c.key+': image hash changed after review');
  if(m.downloadStatus!==200||!/^https:\/\/upload\.wikimedia\.org\/.*\/thumb\//.test(m.thumbnailUrl))errors.push(c.key+': image download provenance invalid');
  const page=pages[m.filename];if(!page?.wikitext&&!(page?.contentSha256&&page?.licenseTemplates?.length&&page?.httpStatus===200)){const html=requests.get(im.sourceUrl);if(html?.status!==200)errors.push(c.key+': Commons file page evidence missing');}
  const meta=metadata[m.filename];if(!meta?.extmetadata?.LicenseShortName)errors.push(c.key+': Commons license metadata missing');
  checks.push({key:c.key,file:im.file,sha256:m.sha256,source:im.sourceUrl,revision:page?.revisionId||m.filePageRevision||null,license:im.license,sourceResponseStatus:200});
 }
}
const result={result:errors.length?'FAIL':'PASS',checkedAt:new Date().toISOString(),entries:rows.length,errors,checks};await save('audit.json',result);console.log(JSON.stringify({...result,checks:checks.length},null,2));process.exitCode=errors.length?1:0;
