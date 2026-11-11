import {read,save} from './research.mjs';
const name='stage10a2-batch22-details.json',rows=await read(name,[]);
rows.find(x=>x[0]==='experiencia-chocolate-punta-cana')[4]='punta-cana';
rows.find(x=>x[0]==='experiencia-cueva-fun-fun')[4]='haitises';
await save(name,rows);
