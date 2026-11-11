import {read,save} from './research.mjs';
const name=process.argv[2],input=await read(name,null);if(!input)throw Error('Missing authored detail batch');
const specs=await read('stage10a2-new-specs.json',[]),rows=await read('candidates.json',[]),media=await read('stage10a2-new-media.json',{});
for(const [key,kind,es,en,imageFrom,province,sourceKey] of input){
 const own=media[key];const image=own?null:imageFrom;
 if(!own&&!media[image]&&!rows.some(c=>c.key===image))throw Error('Missing image reference '+key+' '+image);
 const ref=rows.find(c=>c.key===image)?.title;
 const notes=own?'Imagen identificada de la entidad; crédito y licencia conservados.':`Imagen contextual: ${ref?.es||image}; no representa necesariamente el lugar o la actividad exactos.`;
 const spec=[key,kind,es,en,image,province,notes,sourceKey||key];
 const i=specs.findIndex(x=>x[0]===key);if(i<0)specs.push(spec);else specs[i]=spec;
}
await save('stage10a2-new-specs.json',specs);
const batch=name.replace('-details','');await save(batch,input.map(([key,,,,,,,a,b,c,d])=>[key,a,b,c,d]));
process.argv[2]=batch;
await import('./stage10a2-apply.mjs');
