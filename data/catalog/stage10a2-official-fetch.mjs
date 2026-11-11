import {read,save,request} from './research.mjs';
import {clean} from './media.mjs';
const stored=await read('evidence/stage10a2-articles.json',{});
for(const [key,s] of Object.entries(stored))if(s.editor==='Ministerio de Turismo'&&s.extract?.startsWith('Things To Do Immerse yourself')){stored[key]={...s,status:302,extract:undefined,reason:'Redirected to general activities index; not evidence for this entity.'};}
await save('evidence/stage10a2-articles.json',stored);
for(const [key,slug] of await read(process.argv[2]||'stage10a2-official-plan.json',[])){
 const all=await read('evidence/stage10a2-articles.json',{});if(all[key]?.editor==='Ministerio de Turismo'&&all[key]?.status===200)continue;
 const url='https://www.godominicanrepublic.com/things-to-do/'+slug;
 const r=await request(url,{json:false});if(r.status!==200||typeof r.body!=='string'){console.log('OFFICIAL BLOCKED',key,r.status);continue;}
 const main=r.body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
 const text=clean(main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''));
 if(text.length<150||text.startsWith('Things To Do Immerse yourself')||/page not found|this page doesn.t exist/i.test(text)){console.log('OFFICIAL THIN OR REDIRECT',key,text.slice(0,60));continue;}
 const latest=await read('evidence/stage10a2-articles.json',{});latest[key]={status:200,url,editor:'Ministerio de Turismo',lang:'en',extract:text,checkedAt:r.checkedAt,checkedVia:url,title:slug,wikidata:latest[key]?.wikidata};await save('evidence/stage10a2-articles.json',latest);console.log('OFFICIAL SAVED',key,text.length);
}
