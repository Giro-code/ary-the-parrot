import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const candidates=JSON.parse(await fs.readFile(path.join(base,'data/catalog/candidates.json'),'utf8'));
const errors=[],keys=new Set(),qids=new Set(),tags=new Set(['history','music','food','nature','art','adventure']);
const kinds=new Set(['place','food','music','tradition','craft','nature','museum','beach','region','species','experience','person']);
const minimums={tradition:35,food:35,musicArt:20,beach:30,nature:45,place:45,museum:20,experience:20,person:12};
const categoryCounts=Object.fromEntries(Object.keys(minimums).map(k=>[k,0]));
const canonicalTitles=new Map();
function canonicalTitle(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/\b(provincia|municipio|ciudad)\s+(de\s+)?/g,'').replace(/[^a-z0-9]/g,'');}
function concreteSource(value){try{const u=new URL(value);return u.protocol==='https:'&&!/api\.php|\/w\/api|\/api\//i.test(value)&&!u.search&&u.pathname.split('/').filter(Boolean).length>=1&&!/^\/(?:wiki\/)?(?:Main_Page|Portada|Special:|Category:|Categoría:|destinations|things-to-do|travel|que-hacer)\/?$/i.test(u.pathname);}catch{return false;}}
function sentences(value){return typeof value==='string'?(value.match(/[^.!?]+[.!?](?:\s|$)/g)||[]).length:0;}
const expected=['ciudad-colonial','haitises','ballenas','mangu','merengue','bachata','larimar','ambar','carnaval','altos-chavon','cocolo','congos'];
const textFields=['title','summary','description'];
function check(condition,key,message){if(!condition)errors.push(key+': '+message);}
function https(value){try{return new URL(value).protocol==='https:'}catch{return false}}
function text(value,key){check(typeof value==='string'&&value.trim().length>0,key,'nonempty text required');if(typeof value==='string')check(!/\$|\bUSD\b|\bRD\$|\d{1,2}:\d{2}|https?:\/\/|www\./i.test(value),key,'price, time or URL in editorial text');}
function bilingual(value,key){for(const l of ['es','en'])text(value?.[l],key+'.'+l);}
function webpDimensions(buf){
 if(buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WEBP')return null;
 for(let offset=12;offset+8<buf.length;){const type=buf.toString('ascii',offset,offset+4),size=buf.readUInt32LE(offset+4),pos=offset+8;
  if(type==='VP8X')return {w:1+buf.readUIntLE(pos+4,3),h:1+buf.readUIntLE(pos+7,3)};
  if(type==='VP8 '&&buf[pos+3]===0x9d&&buf[pos+4]===1&&buf[pos+5]===0x2a)return {w:buf.readUInt16LE(pos+6)&0x3fff,h:buf.readUInt16LE(pos+8)&0x3fff};
  if(type==='VP8L'&&buf[pos]===0x2f){const bits=buf.readUInt32LE(pos+1);return {w:(bits&0x3fff)+1,h:((bits>>14)&0x3fff)+1};}
  offset=pos+size+(size%2);
 }return null;
}
let photoCount=0,locations=0,totalReferenced=0;
check(Array.isArray(candidates),'catalog','array required');
for(const c of candidates){
 const k=c.key;check(typeof k==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(k),String(k),'invalid key');check(!keys.has(k),k,'duplicate key');keys.add(k);
 check(c.status==='draft',k,'status must be draft');check(kinds.has(c.kind),k,'invalid kind');
 check(Array.isArray(c.tags)&&c.tags.length>0&&c.tags.every(t=>tags.has(t)),k,'invalid Interest tags');
 check(c.wikidata===null||(typeof c.wikidata==='string'&&/^Q\d+$/.test(c.wikidata)),k,'invalid optional Wikidata QID');if(c.wikidata){check(!qids.has(c.wikidata),k,'duplicate entity');qids.add(c.wikidata);}
 text(c.province,k+'.province');for(const field of textFields)bilingual(c[field],k+'.'+field);
 const category=['music','craft'].includes(c.kind)?'musicArt':c.kind;if(category in categoryCounts)categoryCounts[category]++;
 for(const l of ['es','en']){
  check(c.description?.[l]?.length>=140,k,'description '+l+' must have at least 140 characters');
  check(sentences(c.description?.[l])>=2&&sentences(c.description?.[l])<=4,k,'description '+l+' must have 2 to 4 sentences');
  check(c.summary?.[l]?.length<=160&&sentences(c.summary?.[l])===1,k,'summary '+l+' must be one sentence, at most 160 characters');
  check(!/su ubicaci[oó]n est[aá] vinculada a|its location is associated with/i.test(c.description?.[l]||''),k,'placeholder description');
  const canonical=l+':'+canonicalTitle(c.title[l]);check(!canonicalTitles.has(canonical),k,'duplicate or city/province near-duplicate title: '+canonicalTitles.get(canonical));canonicalTitles.set(canonical,k);
 }
 for(const l of ['es','en']){check(Array.isArray(c.aliases?.[l])&&c.aliases[l].length>0,k,'aliases '+l+' required');for(const alias of c.aliases?.[l]||[]){text(alias,k+'.aliases');check(alias===alias.toLowerCase(),k,'alias must be lowercase');}}
 check(Array.isArray(c.facts)&&c.facts.length>0,k,'facts required');
 check(Array.isArray(c.sources)&&c.sources.length>0,k,'sources required');
 for(const s of c.sources||[]){check(https(s.url),k,'source must be HTTPS');text(s.editor,k+'.source.editor');check(/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt),k,'checkedAt date required');check(s.httpStatus===200,k,'source was not HTTP 200');}
 const sourceUrls=new Set(c.sources?.map(s=>s.url));
 check(c.facts?.length>=2&&c.facts?.length<=5,k,'2 to 5 facts required');
 for(const s of c.sources||[])check(concreteSource(s.url),k,'source must be a concrete page, never an API or general index');
 check(c.sources?.some(s=>!s.url.includes('wikidata.org')),k,'primary article or official page required');
 if(c.wikidata)check(sourceUrls.has('https://www.wikidata.org/wiki/'+c.wikidata),k,'secondary Wikidata entity page required');
 for(const f of c.facts||[]){bilingual(f.text,k+'.fact');check(https(f.sourceUrl),k,'fact source must be HTTPS');check(sourceUrls.has(f.sourceUrl),k,'fact source is not in sources');}
 if(c.location!=null){locations++;const l=c.location;check(['place','nature','museum','beach','region'].includes(c.kind),k,'non-geographic topic has location');text(l.label,k+'.location.label');check(Number.isFinite(l.lat)&&l.lat>=17.3&&l.lat<=20,k,'latitude outside RD');check(Number.isFinite(l.lng)&&l.lng>=-72.1&&l.lng<=-68.2,k,'longitude outside RD');check(Math.abs(l.lat*10000-Math.round(l.lat*10000))<0.00001&&Math.abs(l.lng*10000-Math.round(l.lng*10000))<0.00001,k,'coordinates exceed four decimals');check(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/.test(l.source),k,'location source must be Wikidata');}
 check(Array.isArray(c.images)&&c.images.length>=1&&c.images.length<=3,k,'1 to 3 licensed photos required');
 for(const im of c.images||[]){photoCount++;bilingual(im.alt,k+'.image.alt');text(im.author,k+'.image.author');check(/^(CC BY(?:-SA)? [1234]\.[05](?: [a-z]{2,})?|CC0 1.0|Public domain)$/i.test(im.license),k,'unsupported license');check(https(im.licenseUrl),k,'license URL must be HTTPS');check(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(im.sourceUrl),k,'photo source must be Commons file page');
  for(const field of ['file','thumb']){const url=im[field];if(!/^\/assets\/catalog\/[a-z0-9-]+\.webp$/.test(url)){errors.push(k+': unsafe local image path');continue;}
   try{const buf=await fs.readFile(path.join(base,'public',url));totalReferenced+=buf.length;check(buf.length>0&&buf.length<400000,k,'image must be under 400 KB');const d=webpDimensions(buf);check(d&&d.w<=(field==='thumb'?480:1200)&&d.h<=(field==='thumb'?480:1200),k,'invalid WebP dimensions');}catch{errors.push(k+': missing '+url);}
  }
 }
 text(c.reviewNotes,k+'.reviewNotes');
}
for(const key of expected)check(keys.has(key),'catalog','missing original seed key '+key);
async function folderBytes(dir){let bytes=0;for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);bytes+=f.isDirectory()?await folderBytes(p):(await fs.stat(p)).size;}return bytes;}
const bytes=await folderBytes(path.join(base,'public/assets/catalog')).catch(()=>0);
const requiredProvinces=['Azua','Bahoruco','Barahona','Dajabón','Distrito Nacional','Duarte','El Seibo','Elías Piña','Espaillat','Hato Mayor','Hermanas Mirabal','Independencia','La Altagracia','La Romana','La Vega','María Trinidad Sánchez','Monseñor Nouel','Monte Cristi','Monte Plata','Pedernales','Peravia','Puerto Plata','Samaná','San Cristóbal','San José de Ocoa','San Juan','San Pedro de Macorís','Santiago','Santiago Rodríguez','Santo Domingo','Sánchez Ramírez','Valverde'];
const presentProvinces=new Set(candidates.map(c=>c.province));for(const p of requiredProvinces)check(presentProvinces.has(p),'catalog','missing province '+p);
check(bytes<200000000,'catalog','image directory exceeds 200 MB');
check(candidates.length>300,'catalog','must exceed 300 entries');
for(const [category,min] of Object.entries(minimums))check(categoryCounts[category]>=min,'catalog',category+' requires '+min+'; found '+categoryCounts[category]);
check(candidates.filter(c=>c.kind==='region').length<=40,'catalog','more than 40 regions');
check(candidates.filter(c=>c.kind==='species').length<=20,'catalog','more than 20 species');
const result={result:errors.length?'FAIL':'PASS',checkedAt:new Date().toISOString(),entries:candidates.length,categoryCounts,minimums,photos:photoCount,locations,coveredProvinces:requiredProvinces.filter(p=>presentProvinces.has(p)).length,provinceValues:[...presentProvinces].sort(),imageDirectoryBytes:bytes,referencedImageBytes:totalReferenced,errors};
await fs.writeFile(path.join(base,'data/catalog/validation.json'),JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));process.exitCode=errors.length?1:0;
