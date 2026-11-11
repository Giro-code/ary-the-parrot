import {read,save} from './research.mjs';
const rows=await read('candidates.json',[]),media=await read('stage10a2-new-media.json',{}),corrections=[];
function reuse(key,from,es,en,reason){
 const c=rows.find(x=>x.key===key),ref=rows.find(x=>x.key===from);
 const image=media[from]?.image||ref?.images[0];if(!c||!image)throw Error('Missing correction '+key+' '+from);
 const previous=c.images[0].sourceUrl;c.images=[structuredClone(image)];c.images[0].alt={es,en};
 c.reviewNotes+=' Revisión fotográfica final: '+reason;
 corrections.push({key,from,previousSourceUrl:previous,sourceUrl:image.sourceUrl,reason});
}
reuse('parque-nacional-submarino-la-caleta','playa-la-caleta','Playa de La Caleta en el parque submarino dominicano','La Caleta beach in the Dominican underwater park','Sustituida la foto de pelícanos cuya localización no quedó acreditada por una playa identificada expresamente en Commons como parte del parque.');
reuse('laguna-de-oviedo','parque-nacional-jaragua','Flamencos en la Laguna de Oviedo','Flamingos at Laguna de Oviedo','Sustituida la vista satelital por la fotografía de flamencos identificada como CaribFlamingosLOviedo2.');
reuse('playa-san-rafael','bahia-de-las-aguilas','Contexto de la costa suroeste: Bahía de las Águilas; no muestra Playa San Rafael','Southwest coast context: Bahía de las Águilas; not San Rafael Beach','Excluida Playa San Rafael.jpg: sus metadatos la sitúan en Punta del Este, Uruguay. Se usa contexto dominicano claramente identificado.');
reuse('playa-los-patos','bahia-de-las-aguilas','Contexto de la costa suroeste: Bahía de las Águilas; no muestra Los Patos','Southwest coast context: Bahía de las Águilas; not Los Patos','Se retira la imagen satelital de una laguna distinta; se identifica el paisaje costero contextual sin atribuirlo a Los Patos.');
reuse('museo-gregorio-luperon','puerto-plata','Vista contextual de Puerto Plata; no muestra la fachada del Museo Gregorio Luperón','Contextual view of Puerto Plata; not the Gregorio Luperón Museum façade','El retrato histórico de Luperón no se usa como fotografía de un museo.');
for(const key of ['monte-cristi','carnaval-montecristi','experiencia-sendero-cangrejo'])reuse(key,'parque-nacional-monte-cristi','Costa del Parque Nacional Monte Cristi; imagen contextual, no muestra un carnaval ni el sendero completo','Monte Cristi National Park coast; context image, not a carnival or the complete trail','Se sustituye la postal histórica coloreada por una fotografía del paisaje natural de Monte Cristi.');
for(const key of ['laguna-gri-gri','experiencia-paseo-gri-gri'])reuse(key,'reserva-cientifica-natural-lagunas-redonda-y-limon','Contexto de humedales dominicanos: lagunas Redonda y Limón; no muestra Gri-Gri','Dominican wetland context: Redonda and Limón lagoons; not Gri-Gri','Se retira la imagen satelital de Oviedo, una laguna de otra región, y se identifica expresamente el humedal contextual.');
reuse('experiencia-aves-oviedo','laguna-de-oviedo','Flamencos en la Laguna de Oviedo; contexto de observación de aves','Flamingos at Laguna de Oviedo; birdwatching context','Se muestra fauna del lugar en vez de la imagen satelital.');
await save('candidates.json',rows);await save('evidence/stage10a2-photo-corrections.json',corrections);
const rejected=await read('rejected.json',[]);rejected.push({key:'image-playa-san-rafael-uruguay',stage:'10A2',reason:'wrong_location',detail:'Playa San Rafael.jpg corresponde a Punta del Este, Maldonado, Uruguay; no se utiliza en el catálogo dominicano.'});await save('rejected.json',rejected);
const batches=await read('batches.json',[]);batches.push({batch:'stage10a2-final-photo-corrections',stage:'10A2',checkedAt:new Date().toISOString(),corrections:corrections.length,total:rows.length});await save('batches.json',batches);
console.log('PHOTO CORRECTIONS SAVED',corrections.length);
