import {read,save} from './research.mjs';
const stream=await read('evidence/stage10a2-official-stream.json','');
const found=new Map();
function walk(o){if(!o||typeof o!=='object')return;if(o.slug&&o.thumb_title)found.set(o.slug,o);for(const v of Object.values(o))if(typeof v==='object')walk(v);}
for(const line of stream.split('\n')){let i=line.indexOf(':');if(line.includes('19:['))i=line.indexOf('19:[')+2;if(i<0)continue;try{walk(JSON.parse(line.slice(i+1)));}catch{}}
await save('evidence/stage10a2-official-objects.json',Object.fromEntries(found));
console.log('OBJECTS',found.size);
console.log([...found].map(([k,v])=>[k,v.thumb_title,v.thumb_description,JSON.stringify(v.blocks||[]).slice(0,400)].join('\t')).join('\n'));
