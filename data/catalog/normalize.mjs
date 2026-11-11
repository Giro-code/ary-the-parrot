import fs from 'node:fs/promises';
import path from 'node:path';
import {read,save,ids,label,root} from './research.mjs';
import {slug} from './build-geo.mjs';
import {photoMetadata,filePages,materializePhoto} from './media.mjs';
const rows=await read('candidates.json',[]),all=await read('evidence/entities.json',{}),changes=[];
let media=await read('evidence/media.json',{});
for(const c of rows){
 const e=all[c.wikidata],oldKey=c.key;let renamed=false;
 const isProvince=ids(e,'P31').includes('Q913337');
 if(c.kind==='region'&&c.title.es.startsWith('Provincia de ')&&!isProvince){
  const title={es:label(e)||c.title.es.replace(/^Provincia de /,''),en:label(e,'en')||c.title.en};
  const old={...c.title};c.title=title;let key=slug(title.es);if(rows.some(x=>x!==c&&x.key===key))key+='-'+c.wikidata.toLowerCase();c.key=key;renamed=true;
  for(const field of ['summary','description'])for(const l of ['es','en'])c[field][l]=c[field][l].replaceAll(old[l],title[l]).replaceAll('provincia dominicana','localidad dominicana').replaceAll('Dominican province','Dominican locality');
  for(const f of c.facts)for(const l of ['es','en'])f.text[l]=f.text[l].replaceAll(old[l],title[l]).replaceAll('provincia dominicana','localidad dominicana').replaceAll('Dominican province','Dominican locality');
  c.aliases={es:[title.es.toLowerCase(),title.es.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()],en:[title.en.toLowerCase()]};
  changes.push({key:oldKey,newKey:c.key,reason:'A municipality mentioning its province was incorrectly classified by a loose text match. Reclassified from the entity type and corrected its own bilingual prose.'});
 }
 if(/^Q\d+$/.test(c.title.en)){
  const old=c.title.en;c.title.en=c.title.es;for(const f of ['summary','description'])c[f].en=c[f].en.replaceAll(old,c.title.en);for(const f of c.facts)f.text.en=f.text.en.replaceAll(old,c.title.en);c.aliases.en=[c.title.en.toLowerCase()];changes.push({key:c.key,reason:'Use the documented proper name instead of an untranslated QID.'});
 }
 c.province=c.province.replace(/^Provincia (?:de )?/,'').replace(/ \(República Dominicana\)$/,'');
 for(const f of [c.summary,c.description,...c.facts.map(f=>f.text)]){f.es=f.es.replace('una puente','un puente').replace('una sistema','un sistema');}
 let m=media[oldKey];
 if(m && (renamed || m.image.sourceUrl!==c.images[0]?.sourceUrl)){
  const filename=decodeURIComponent(new URL(c.images[0].sourceUrl).pathname.split('/wiki/File:')[1]).replaceAll('_',' ');
  if(m.image.sourceUrl===c.images[0].sourceUrl){
   const image={...m.image,file:'/assets/catalog/'+c.key+'-1.webp',thumb:'/assets/catalog/'+c.key+'-1-480.webp',alt:{es:'Imagen de referencia de '+c.title.es,en:'Reference image of '+c.title.en}};
   await fs.copyFile(path.join(root,'public',m.image.file),path.join(root,'public',image.file));await fs.copyFile(path.join(root,'public',m.image.thumb),path.join(root,'public',image.thumb));m={...m,image};media[c.key]=m;
  }else{
   await photoMetadata([filename]);await filePages([filename]);m=await materializePhoto(filename,c.key,c.title);media=await read('evidence/media.json',{});media[c.key]=m;
  }
  c.images=[m.image];
 }
 for(const im of c.images){
  if(/^https?:\/\//.test(im.author)){
   const url=new URL(im.author);let author;
   if(url.hostname.includes('flickr.com'))author='Flickr: '+decodeURIComponent(url.pathname.split('/').filter(Boolean)[1]||url.pathname);
   if(url.hostname==='commons.wikimedia.org')author=url.searchParams.get('title')?.replace(/^User:/,'')||decodeURIComponent(url.pathname.split('/User:')[1]||'');
   if(!author)throw Error('Author URL needs manual attribution review: '+im.author);
   im.authorUrl=im.author.replace(/^http:/,'https:');im.author=author;
   if(media[c.key])media[c.key].image={...media[c.key].image,author,authorUrl:im.authorUrl};changes.push({key:c.key,reason:'Preserved the documented author account name and moved its profile URL into authorUrl.'});
  }
 }
}
await save('evidence/media.json',media);await save('candidates.json',rows);await save('evidence/editorial-corrections.json',changes);console.log('NORMALIZED',rows.length,changes.length);
