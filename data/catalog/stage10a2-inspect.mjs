import {read,request,save} from './research.mjs';
if(process.argv[2]==='official'){
 const r=await request('https://www.godominicanrepublic.com/things-to-do/all-activities',{json:false});
 const strings=[...r.body.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(m=>JSON.parse(m[1]));
 const stream=strings.join('');
 await save('evidence/stage10a2-official-stream.json',stream);
 for(const t of ['beach','museums','activities','slug','description']){let i=stream.lastIndexOf(t);console.log(t,i,stream.slice(i-150,i+800));}
}else{
 const s=await read('evidence/stage10a2-articles.json',{}),rows=await read('candidates.json',[]);
 const done=new Set(rows.filter(c=>c.enrichmentBatch).map(c=>c.key));
 console.log(Object.entries(s).filter(([k,v])=>!done.has(k)&&rows.some(c=>c.key===k)).slice(0,Number(process.argv[2]||20)).map(([k,v])=>k+'\n'+v.extract?.slice(0,1500)).join('\n\n'));
}
