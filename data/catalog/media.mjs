import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {read,save,request,pause,root,date,networkTurn,mergeObject} from './research.mjs';

export const clean = value => String(value||'').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160);/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/\s+/g,' ').trim();
export async function photoMetadata(files) {
 let metadata=await read('evidence/media-metadata.json',{});
 const needed=[...new Set(files)].filter(f=>!metadata[f]);
 for(let i=0;i<needed.length;i+=15){
  const batch=needed.slice(i,i+15);
  const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',titles:batch.map(f=>'File:'+f).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|size|mime|sha1',iiurlwidth:'960',redirects:'1'}));
  for(const page of Object.values(r.body?.query?.pages||{})){
   const name=page.title.replace(/^File:/,'');const info=page.imageinfo?.[0];
   if(info)metadata[name]={...info,apiUrl:r.url,checkedAt:r.checkedAt,httpStatus:r.status};
  }
  for(const f of batch){if(!metadata[f]){const same=Object.keys(metadata).find(k=>k.replaceAll('_',' ')===f.replaceAll('_',' '));if(same)metadata[f]=metadata[same];}}
  metadata=await mergeObject('evidence/media-metadata.json',metadata);console.log('MEDIA METADATA',i+batch.length,needed.length);
 }
 return metadata;
}
export async function filePages(files){
 let pages=await read('evidence/file-pages.json',{});
 const needed=[...new Set(files)].filter(f=>!pages[f]?.wikitext);
 for(let i=0;i<needed.length;i+=15){
  const batch=needed.slice(i,i+15);
  const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',titles:batch.map(f=>'File:'+f).join('|'),prop:'revisions',rvprop:'ids|content',rvslots:'main',redirects:'1'}));
  for(const page of Object.values(r.body?.query?.pages||{})){
   const name=page.title.replace(/^File:/,'');const revision=page.revisions?.[0];
   if(revision)pages[name]={pageId:page.pageid,revisionId:revision.revid,wikitext:revision.slots?.main?.['*']||revision['*'],apiUrl:r.url,httpStatus:r.status,checkedAt:r.checkedAt};
  }
  for(const f of batch){if(!pages[f]){const same=Object.keys(pages).find(k=>k.replaceAll('_',' ')===f.replaceAll('_',' '));if(same)pages[f]=pages[same];}}
  pages=await mergeObject('evidence/file-pages.json',pages);console.log('FILE PAGES',i+batch.length,needed.length);
 }
 return pages;
}
export async function materializePhoto(filename,key,title) {
 const cache=await read('evidence/media.json',{});
 if(cache[key]?.filename===filename)return cache[key];
 if(/(?:\b(?:flag|logo|coat of arms|distribution map|location map|relief location map)\b|original-scientific-illustration|1894\.jpg$|ilustraci[oó]n de)/i.test(filename))throw Error('Selected file is a logo, map or illustration rather than a photograph');
 const meta=(await read('evidence/media-metadata.json',{}))[filename];
 if(!meta)throw Error('No Commons metadata: '+filename);
 if(!/image\/(jpeg|png|webp|tiff)/.test(meta.mime))throw Error('Not a raster photograph: '+meta.mime);
 const ext=meta.extmetadata||{},code=clean(ext.LicenseShortName?.value),author=clean(ext.Artist?.value);
 let license=code,licenseUrl=clean(ext.LicenseUrl?.value).replace(/^http:/,'https:');
 if(/^Public domain|^PD\b/i.test(code)){license='Public domain';licenseUrl='https://creativecommons.org/publicdomain/mark/1.0/';}
 if(/CC0/.test(code)){license='CC0 1.0';licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/';}
 if(!/^(CC BY(?:-SA)? [1234]\.[05](?: [a-z]{2,})?|CC0 1.0|Public domain)$/i.test(license))throw Error('License not allowed: '+code);
 if(!author)throw Error('No author in Commons metadata');
 const sourceUrl=meta.descriptionurl.replace(/^http:/,'https:');
 let pageRecord=(await read('evidence/file-pages.json',{}))[filename];
 if(!pageRecord?.wikitext)pageRecord=(await filePages([filename]))[filename];
 if(!pageRecord || pageRecord.httpStatus!==200)throw Error('Commons file page revision unavailable');
 const pageText=clean(pageRecord.wikitext);
 if(license==='Public domain'){
  if(!/public domain|dominio p[úu]blico|\{\{\s*(?:self\|)?pd[-|}]/i.test(pageText))throw Error('Public domain not confirmed on file page');
 } else if(!pageText.toLowerCase().includes(license.toLowerCase().replaceAll(' ','-')) && !(license==='CC0 1.0'&&/cc-zero|cc0/i.test(pageText)) && !(/^CC BY-SA [1234]\.[05]$/.test(license)&&/cc-by-sa-all/i.test(pageText)) && !(/^CC BY-SA 3\.0$/.test(license)&&/gfdl[^}]*migration\s*=\s*relicense/i.test(pageText))){
  // Institutional templates can transclude the license rather than spell it out.
  // Verify the exact license URL in Commons' rendered file page; keep that evidence.
  const expanded=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'parse',format:'json',page:'File:'+filename,prop:'text'}));
  const html=expanded.body?.parse?.text?.['*']||'';
  if(expanded.status!==200||!licenseUrl||!html.includes(licenseUrl.replace(/^https?:/,'')))throw Error('License template not confirmed on file page');
  await save('evidence/expanded-license-'+key+'.json',{filename,license,licenseUrl,checkedVia:expanded.url,status:expanded.status,checkedAt:date});
 }
 if(/(?:copyright violation|copyvio|nominated for deletion|deletion request|personality rights|consent required)/i.test(pageText))throw Error('Rights or deletion warning on file page');
 if(!meta.thumburl)throw Error('No reduced thumbnail (original not downloaded)');
 const downloadUrl=new URL(meta.thumburl); downloadUrl.hostname='upload.wikimedia.org'; downloadUrl.search='';
 if(!downloadUrl.pathname.includes('/thumb/') && /\/wikipedia\/commons\/[a-f0-9]\/[a-f0-9]{2}\//.test(downloadUrl.pathname)){
  const originalPath=downloadUrl.pathname.replace('/wikipedia/commons/','/wikipedia/commons/thumb/');
  const reducedWidth=meta.width>330?330:meta.width>250?250:meta.width>120?120:60;
  downloadUrl.pathname=originalPath+'/'+reducedWidth+'px-'+originalPath.split('/').pop();
 }
 if(!downloadUrl.pathname.includes('/thumb/'))throw Error('Download is not a reduced thumbnail');
 await networkTurn();
 const response=await fetch(downloadUrl,{headers:{'User-Agent':'AryCatalogBot/1.0 (cultural guide research)'},signal:AbortSignal.timeout(45000)});
 if(!response.ok){await save('evidence/download-failures/'+key+'.json',{url:downloadUrl.href,status:response.status,checkedAt:date});if(response.status===429)await pause(60000);throw Error('Thumbnail HTTP '+response.status);}
 const input=Buffer.from(await response.arrayBuffer());
 if(input.length>8*1024*1024)throw Error('Unexpectedly large thumbnail');
 const base=path.join(root,'public/assets/catalog');await fs.mkdir(base,{recursive:true});
 const file=path.join(base,key+'-1.webp'),thumb=path.join(base,key+'-1-480.webp');
 let buffer=await sharp(input).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:70}).toBuffer();
 if(buffer.length>=180000)buffer=await sharp(input).rotate().resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:62}).toBuffer();
 if(buffer.length>=400000)throw Error('WebP exceeds 400 KB');
 await fs.writeFile(file,buffer);await sharp(buffer).resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:70}).toFile(thumb);
 const dimensions=await sharp(buffer).metadata();
 const image={file:'/assets/catalog/'+key+'-1.webp',thumb:'/assets/catalog/'+key+'-1-480.webp',author,license,licenseUrl,sourceUrl,alt:{es:'Imagen de referencia de '+title.es,en:'Reference image of '+title.en}};
 cache[key]={filename,image,width:dimensions.width,height:dimensions.height,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),thumbnailUrl:downloadUrl.href,finalDownloadUrl:response.url,downloadStatus:response.status,filePageStatus:pageRecord.httpStatus,filePageRevision:pageRecord.revisionId,filePageApiUrl:pageRecord.apiUrl,checkedAt:date,description:clean(ext.ImageDescription?.value),modifications:'Reduced Commons thumbnail; resized without cropping; WebP quality 70 (62 for large files); thumbnail up to 480 px. Derivatives retain the selected license.'};
 await mergeObject('evidence/media.json',{[key]:cache[key]});return cache[key];
}
