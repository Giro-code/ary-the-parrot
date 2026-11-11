import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const root = path.resolve(import.meta.dirname, '../..');
export const data = path.join(root, 'data/catalog');
export const ua = 'AryCatalogBot/1.0 (cultural guide research)';
export const date = new Date().toISOString().slice(0,10);
export const pause = ms => new Promise(r=>setTimeout(r,ms));
export async function networkTurn(){
 const lock=path.join(data,'.network-lock');await fs.mkdir(data,{recursive:true});
 while(true){
  try{await fs.mkdir(lock);break;}catch{const stat=await fs.stat(lock).catch(()=>null);if(stat&&Date.now()-stat.mtimeMs>120000)await fs.rmdir(lock).catch(()=>{});await pause(500);}
 }
 try{const last=await read('evidence/network-clock.json',{at:0});await pause(Math.max(0,4000-(Date.now()-last.at)));await save('evidence/network-clock.json',{at:Date.now()});}finally{await fs.rmdir(lock);}
}
export async function save(name,value) { const target=path.join(data,name); await fs.mkdir(path.dirname(target),{recursive:true}); const temp=target+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n','utf8');await fs.rename(temp,target); }
export async function read(name,fallback) {try{return JSON.parse(await fs.readFile(path.join(data,name),'utf8'));}catch{return fallback;}}
export async function locked(name,fn){
 const lock=path.join(data,'.lock-'+name.replace(/[^a-z0-9]/gi,'-'));
 while(true){try{await fs.mkdir(lock);break;}catch{const stat=await fs.stat(lock).catch(()=>null);if(stat&&Date.now()-stat.mtimeMs>120000)await fs.rmdir(lock).catch(()=>{});await pause(100);}}
 try{return await fn();}finally{await fs.rmdir(lock);}
}
export async function mergeObject(name,patch){return locked(name,async()=>{const result={...(await read(name,{})),...patch};await save(name,result);return result;});}
export async function commitCandidates(entries,batch){return locked('candidates',async()=>{
 const result=await read('candidates.json',[]);for(const c of entries)if(!result.some(x=>(c.wikidata&&x.wikidata===c.wikidata)||x.key===c.key))result.push(c);
 await save('candidates.json',result);const batches=await read('batches.json',[]);batches.push({...batch,total:result.length});await save('batches.json',batches);return result;
});}
export async function request(url,{json=true,cache=true}={}) {
  const key=crypto.createHash('sha256').update(url).digest('hex');
  const cached=await read('evidence/requests/'+key+'.json',null);
  if(cache&&cached?.status===403)return cached;
  if(cache && cached && !cached.contentOmitted && (cached.status===200 || cached.status===403 || (cached.status!==429 && Date.now()-Date.parse(cached.requestedAt||cached.checkedAt)<900000))) return cached;
  await networkTurn();
  let result;
  try {
    const response=await fetch(url,{headers:{'User-Agent':ua,Accept:json?'application/json':'text/html'},signal:AbortSignal.timeout(45000)});
    const body=await response.text();
    result={url,status:response.status,checkedAt:date,requestedAt:new Date().toISOString(),retryAfter:response.headers.get('retry-after'),body:json?(()=>{try{return JSON.parse(body)}catch{return body.slice(0,2000)}})():body};
    if(response.status===429) await pause(Math.min(60000,Math.max(15000,Number(result.retryAfter||60)*1000)));
  } catch(e) {result={url,status:0,checkedAt:date,error:String(e)}}
  await save('evidence/requests/'+key+'.json',result);
  if(result.status!==200) console.log('SOURCE',result.status,url.slice(0,130));
  return result;
}
export async function entities(ids) {
  let all=await read('evidence/entities.json',{});
  const needed=[...new Set(ids)].filter(id=>!all[id]);
  for(let i=0;i<needed.length;i+=40){
    const result=await request('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:needed.slice(i,i+40).join('|'),props:'labels|descriptions|aliases|claims|sitelinks',languages:'es|en',format:'json'}));
    Object.assign(all,result.body?.entities||{}); all=await mergeObject('evidence/entities.json',all);
    console.log('ENTITIES',i+Math.min(40,needed.length-i),'/',needed.length);
  }
  return all;
}
export const claim=(e,p)=>e?.claims?.[p]?.filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value).filter(x=>x!==undefined)||[];
export const ids=(e,p)=>claim(e,p).map(v=>v.id).filter(Boolean);
export const label=(e,l='es')=>e?.labels?.[l]?.value||e?.labels?.en?.value||e?.labels?.es?.value||e?.id;

if(process.argv[2]==='discover') {
  const query='SELECT DISTINCT ?item WHERE { ?item wdt:P17 wd:Q786; wdt:P18 ?image. FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 } }';
  const r=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}));
  const found=r.body?.results?.bindings?.map(x=>x.item.value.split('/').pop())||[];
  await save('discovery.json',found);
  const all=await entities(found);
  const admins=[...new Set(Object.values(all).flatMap(e=>[...ids(e,'P131'),...ids(e,'P31')]))];
  const merged=await entities(admins);
  await fs.writeFile(path.join(data,'discovery.tsv'),Object.values(all).filter(e=>found.includes(e.id)).map(e=>[e.id,label(e),e.descriptions?.es?.value||e.descriptions?.en?.value||'',ids(e,'P31').map(q=>label(merged[q])).join(';'),ids(e,'P131').map(q=>label(merged[q])).join(';'),claim(e,'P18')[0]||'',e.sitelinks?.eswiki?.title||e.sitelinks?.enwiki?.title||''].join('\t')).join('\n')+'\n','utf8');
  console.log('DISCOVERED',found.length);
}

if(process.argv[2]==='geo') {
  const query='SELECT DISTINCT ?item WHERE { SERVICE wikibase:box { ?item wdt:P625 ?location. bd:serviceParam wikibase:cornerSouthWest "Point(-72.1 17.3)"^^geo:wktLiteral; wikibase:cornerNorthEast "Point(-68.2 20.0)"^^geo:wktLiteral. } ?item wdt:P18 ?image. FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 } }';
  const r=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}));
  const found=r.body?.results?.bindings?.map(x=>x.item.value.split('/').pop())||[];
  await save('geo-discovery.json',found);
  const all=await entities(found);
  await fs.writeFile(path.join(data,'geo.tsv'),found.filter(id=>all[id]).map(id=>{const e=all[id];return [id,label(e),e.descriptions?.es?.value||e.descriptions?.en?.value||'',ids(e,'P131').map(q=>label(all[q])||q).join(';'),claim(e,'P18')[0]||''].join('\t')}).join('\n')+'\n','utf8');
  console.log('GEO',found.length);
}

if(process.argv[2]==='endemic') {
  const query='SELECT DISTINCT ?item WHERE { VALUES ?area { wd:Q786 wd:Q25277 } ?item wdt:P183 ?area; wdt:P18 ?image. }';
  const r=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}));
  const found=r.body?.results?.bindings?.map(x=>x.item.value.split('/').pop())||[];
  await save('endemic-discovery.json',found);
  const all=await entities(found);
  await fs.writeFile(path.join(data,'endemic.tsv'),found.filter(id=>all[id]).map(id=>{const e=all[id];return [id,label(e),e.descriptions?.es?.value||e.descriptions?.en?.value||'',claim(e,'P18')[0]||''].join('\t')}).join('\n')+'\n','utf8');
  console.log('ENDEMIC',found.length);
}
