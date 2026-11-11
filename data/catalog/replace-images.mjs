import {read,save} from './research.mjs';
import {photoMetadata,filePages,materializePhoto} from './media.mjs';
const replacements={
 'chicharron':'Chicharrón de Cerdo.jpg',
 'habichuelas-con-dulce':'Habichuelas con dulce dominicana.jpg',
 'playa-encuentro':'Playa Encuentro.jpg',
 'jutia-de-la-espanola':'Plagiodontia aedium.jpg',
 'tachycineta-euchrysea':'Adult Hispaniolan Golden Swallow perched on artificial nest-box.jpg',
 'eufonia-antillana':'Hispaniolan Euphonia (Chlorophonia musica) male in the Dominican Republic.jpg',
 'sierra-de-bahoruco':'Hoyo de Pelempito.jpg',
 'parque-nacional-sierra-de-bahoruco':'Hoyo de Pelempito.jpg',
 'gran-teatro-del-cibao':'Lope de Vega GTC.JPG'
};
await photoMetadata(Object.values(replacements));await filePages(Object.values(replacements));
const rows=await read('candidates.json',[]),log=await read('evidence/photo-replacements.json',[]);
for(const [key,filename] of Object.entries(replacements)){
 const c=rows.find(c=>c.key===key);if(!c)continue;
 try{const old=c.images[0]?.sourceUrl;const m=await materializePhoto(filename,key,c.title);c.images=[m.image];c.reviewNotes+=' La fotografía inicial fue sustituida tras la revisión visual.';log.push({key,old,new:m.image.sourceUrl,reason:'Photographic alternative selected after visual or documentary review',at:new Date().toISOString()});console.log('REPLACED',key);}
 catch(e){log.push({key,error:String(e)});console.log('REPLACEMENT PENDING',key,String(e));}
 await save('candidates.json',rows);await save('evidence/photo-replacements.json',log);
}
