const queries = [
  ['wdqs', 'https://query.wikidata.org/sparql?' + new URLSearchParams({query:'SELECT ?s ?sLabel ?image WHERE { ?s wdt:P17 wd:Q786; wdt:P18 ?image. SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" } } LIMIT 10',format:'json'})],
  ['wikipedia', 'https://en.wikipedia.org/api/rest_v1/page/summary/La_Vega,_Dominican_Republic'],
  ['commons', 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({action:'query',format:'json',titles:'File:Dominican Mangu.jpg',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'960'})],
];
for(const [name,url] of queries) {
  try { const r=await fetch(url,{headers:{'User-Agent':'AryCatalogBot/1.0 (cultural guide research)'},signal:AbortSignal.timeout(25000)}); const body=await r.text(); console.log(name,r.status,body.slice(0,1600)); }
  catch(e) { console.log(name,String(e)); }
  await new Promise(r=>setTimeout(r,800));
}
