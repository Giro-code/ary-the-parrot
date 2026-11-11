import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,read,save} from './research.mjs';
const rows=await read('candidates.json',[]);let media=await read('evidence/media.json',{});
for(const c of rows){
 const im=c.images[0];if(!im)continue;
 const bytes=await fs.readFile(path.join(root,'public',im.file));const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 let m=media[c.key];
 if(!m||m.image.sourceUrl!==im.sourceUrl||m.sha256!==hash){m=Object.values(media).find(x=>x.image.sourceUrl===im.sourceUrl&&x.sha256===hash);if(!m)throw Error('Cannot reconcile actual image with provenance: '+c.key);}
 if(/^https?:\/\//.test(im.author)){
  const url=new URL(im.author);let author;if(url.hostname.includes('flickr.com'))author='Flickr: '+decodeURIComponent(url.pathname.split('/').filter(Boolean)[1]||url.pathname);if(url.hostname==='commons.wikimedia.org')author=url.searchParams.get('title')?.replace(/^User:/,'')||decodeURIComponent(url.pathname.split('/User:')[1]||'');if(!author)throw Error('Author requires manual review '+im.author);im.authorUrl=im.author.replace(/^http:/,'https:');im.author=author;
 }
 media[c.key]={...m,image:im};
}
await save('candidates.json',rows);await save('evidence/media.json',media);console.log('MEDIA RECONCILED',rows.length);
