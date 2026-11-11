import {read,save,request,entities} from './research.mjs';
const targets=[
 ['food','Chenchén'],['food','Catibía'],['food','Jalao'],['food','Mabí'],['craft','Muñeca sin rostro'],
 ['music','Palos (música)'],['tradition','Festival del Merengue'],['tradition','Feria Internacional del Libro de Santo Domingo'],
 ['nature','Parque nacional Armando Bermúdez'],['nature','Parque nacional José del Carmen Ramírez'],['nature','Parque nacional Cabo Cabrón'],['nature','Parque nacional El Choco'],['nature','Loma Quita Espuela'],['nature','Loma Isabel de Torres'],['nature','Cayo Arena'],['nature','Cayos Siete Hermanos'],['nature','Salto de la Jalda'],['nature','Salto de Baiguate'],['nature','Cueva Fun Fun'],['nature','Dunas de Baní'],['nature','Laguna de Bávaro'],['nature','Laguna Redonda (República Dominicana)'],['nature','Laguna Limón'],
 ['museum','Museo de Arte Moderno (República Dominicana)'],['museum','Museo Hermanas Mirabal'],['museum','Museo del Larimar'],['place','Plaza de la Cultura'],['region','Luperón (República Dominicana)'],['region','San Ignacio de Sabaneta']
];
let results=await read('evidence/spanish-summaries.json',[]);
for(const [kind,title] of targets){
 if(results.some(x=>x.title===title&&[200,403,404].includes(x.status)))continue;
 const r=await request('https://es.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title));
 const result={kind,title,status:r.status,checkedAt:r.checkedAt,...(typeof r.body==='object'?r.body:{})};results=results.filter(x=>x.title!==title);results.push(result);await save('evidence/spanish-summaries.json',results);console.log('SPANISH',results.length,targets.length,title,r.status);
}
await entities(results.map(x=>x.wikibase_item).filter(Boolean));
