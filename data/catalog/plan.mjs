import {read,save,label,claim,ids,entities,request,data} from './research.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
let all=await read('evidence/entities.json',{});
const discovered=[...new Set([...(await read('discovery.json',[])),...(await read('geo-discovery.json',[]))])];
const types={
 province:['provincia','province','region','region'],
 town:['localidad','locality','region','history'],
 river:['río','river','nature','nature'], island:['isla','island','nature','nature'],
 beach:['playa','beach','beach','nature'], park:['parque nacional','national park','nature','nature'],
 mountain:['formación montañosa','mountain formation','nature','nature'], waterfall:['cascada','waterfall','nature','nature'],
 lake:['lago o laguna','lake or lagoon','nature','nature'], museum:['museo','museum','museum','history'],
 church:['edificio religioso','religious building','place','history'], fort:['fortificación','fortification','place','history'],
 theatre:['teatro','theatre','place','art'], building:['edificio','building','place','history'],
 square:['plaza','square','place','history'], monument:['monumento','monument','place','history'],
 cave:['cueva','cave','nature','nature'], street:['calle','street','place','history'],
};
const manual={
 Q783742:'mountain',Q990182:'town',Q988413:'town',Q34820:'town',Q1639488:'town',Q3687664:'town',Q4490010:'town',Q6118516:'town',Q3877399:'town',Q1954296:'museum',Q13619956:'museum',
 Q16623036:'bridge',Q7258505:'bridge',Q27961519:'bridge',Q6793592:'bridge',Q16892919:'dam',Q63071056:'transport',Q1345375:'transport',Q5593976:'building',
 Q444485:'building',Q668772:'building',Q770641:'building',Q1543031:'monument',Q1981524:'fort',Q2218981:'monument',Q2470834:'town',Q2516819:'fort',Q2983646:'museum',Q3236933:'street',Q3305377:'building',Q3844709:'church',Q4868419:'church',Q4868422:'church',Q5062847:'church',Q5062863:'building',Q5062928:'town',Q5304337:'park',Q5400137:'building',Q5400308:'building',Q5400466:'building',Q5400511:'building',Q5472510:'fort',Q5472508:'museum',Q5755447:'building',Q5908594:'monument',Q5912738:'church',Q6080161:'monument',Q66363867:'museum',Q6898286:'monument',Q6906955:'monument',Q6974727:'monument',Q7126925:'monument',Q7139633:'square',Q7301193:'building',Q7691935:'theatre',Q9046796:'museum',Q14228726:'fort',Q16490562:'monument',Q16938420:'monument',Q20018970:'museum',Q20921731:'church',Q20922039:'building',Q21002920:'theatre',Q21856534:'museum',Q25404685:'park',Q28586259:'church',Q28586664:'church',Q65123094:'park',Q65123142:'town',Q83489574:'church',Q93147461:'museum',Q100507890:'square',Q104184947:'museum',Q106936978:'building',Q106959591:'church',Q106959726:'building',Q106959788:'building',Q106959814:'building',Q106959858:'building',Q106959875:'building',Q106959925:'building',Q106960254:'building',Q107041036:'building',Q107041447:'fort',Q107043982:'church',Q107044033:'church',Q115430915:'monument',Q122222880:'church',Q123048464:'church',Q123048468:'church',Q123048480:'church',Q23779196:'cave',Q23770795:'waterfall',Q4531381:'waterfall',Q125071518:'waterfall',Q23763763:'beach',Q23765458:'beach',Q23775715:'beach',Q23778538:'beach',Q106921160:'beach',Q106921205:'beach',Q125072226:'beach',Q125072833:'beach',Q125081397:'beach',Q125131312:'beach',Q125131988:'beach',Q125131946:'lake',Q23762354:'lake',Q23765504:'river',Q23779385:'river',Q60967713:'river',Q5994389:'river',Q7553040:'river',Q8061044:'river',Q2037402:'lake',Q4842570:'beach',Q1321816:'beach',Q16627237:'river',Q6167460:'river',Q9055961:'park',Q6062972:'cave',Q6062992:'park',Q5969340:'lake',Q7227322:'cave',Q6683320:'cave',Q24238501:'park',Q42090:'park',Q585251:'park',Q16616247:'park',Q6904743:'park',Q11704970:'park',Q123693015:'lake',Q2279055:'mountain',Q286837:'lake',Q1418401:'lake'
};
const excluded=new Set('Q23766999 Q140136741 Q6159869 Q2438383 Q2560011 Q2883437 Q48245 Q5303576 Q123651741 Q6093019 Q5964855 Q139947 Q23764406 Q23585825 Q125469279 Q135193263 Q23758427 Q135494553 Q7065415'.split(' '));
const planned=[];
for(const id of discovered){
 const e=all[id]; if(!e || excluded.has(id)) continue;
 const desc=(e.descriptions?.es?.value||e.descriptions?.en?.value||'').toLowerCase();
 let type=manual[id];
 if(!type && !/haití|haiti|air|aeropuerto|dioc|orden religiosa|olímpic|olympic|metro|hotel|bank|banco|partido|pandemi|embaja|hurac|batalla|crash|vuelo|politic|derech|estudio|cement|pobreza/.test(desc)){
   if(/provincia de la república dominicana/.test(desc)) type='province';
   else if(/municipio|municipalidad|ciudad de república|ciudad de la república|place in .*, dominican|distrito municipal|pueblo en la república|asentamiento en la república|localidad turística/.test(desc)) type='town';
   else if(/río |river|watercourse|curso fluvial/.test(desc)) type='river';
   else if(/isla |island in/.test(desc)) type='island';
   else if(/cordillera|montañ|sierra localiz/.test(desc)) type='mountain';
   else if(/playa|beach/.test(desc)) type='beach';
   else if(/lago |laguna|lake in/.test(desc)) type='lake';
 }
 if(type)planned.push({id,type});
}
await save('geo-plan.json',planned);
console.log('SELECTED',planned.length);
console.log(planned.map(x=>[x.id,x.type,label(all[x.id])].join('\t')).join('\n'));
console.log('PROVINCE-TYPE',ids(all.Q594405,'P31'));
