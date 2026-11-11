import {read,save} from './research.mjs';
const specs=await read('stage10a2-new-specs.json',[]);
specs.find(x=>x[0]==='artesania-miches')[4]='reserva-cientifica-natural-lagunas-redonda-y-limon';
specs.find(x=>x[0]==='artesania-miches')[6]='Foto contextual de las lagunas de la región de Miches; no muestra un taller ni una pieza artesanal.';
await save('stage10a2-new-specs.json',specs);
