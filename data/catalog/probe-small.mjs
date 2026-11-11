import {read,request,networkTurn,save} from './research.mjs';
const file='Río Yaque del Sur, RD.jpg';
const r=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',titles:'File:'+file,prop:'imageinfo',iiprop:'url|size',iiurlwidth:'330'}));
const info=Object.values(r.body?.query?.pages||{})[0]?.imageinfo?.[0];console.log(info);
if(info?.thumburl?.includes('/thumb/')){
 const url=new URL(info.thumburl);url.hostname='upload.wikimedia.org';url.search='';await networkTurn();
 const response=await fetch(url,{headers:{'User-Agent':'AryCatalogBot/1.0 (cultural guide research)'},signal:AbortSignal.timeout(20000)});
 console.log('DOWNLOAD',response.status,response.url,response.headers.get('content-type'));if(!response.ok)console.log((await response.text()).slice(0,1000));
}
