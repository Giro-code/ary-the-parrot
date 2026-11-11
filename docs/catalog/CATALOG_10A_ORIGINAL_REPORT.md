# Catálogo cultural dominicano — etapa 10A

Investigación local, 2026-11-11T16:14:20.599Z. Estado del validador: **PASS**. Todas las fichas son borradores y necesitan aprobación humana.

## Resultado y alcance

- 313 fichas en candidates.json; 313 con fotografía local.
- 62 puntos de guardado registrados en batches.json.
- 26 descartes o incidencias finales en rejected.json.
- 33.429.902 bytes de imágenes en public/assets/catalog/ (33.43 MB; límite decimal de 200 MB).
- Conservación de las doce claves iniciales: ciudad-colonial: sí; haitises: sí; ballenas: sí; mangu: sí; merengue: sí; bachata: sí; larimar: sí; ambar: sí; carnaval: sí; altos-chavon: sí; cocolo: sí; congos: sí. El contenido inicial también está conservado en data/catalog/preserved-seed.json.

Esta tarea escribió solo en data/catalog/, public/assets/catalog/ y docs/catalog/. No ejecutó la aplicación, pruebas del proyecto, cambios de base de datos, commits, push, despliegues, correo ni llamadas a Gemini. Los cambios paralelos del proyecto no forman parte de esta entrega.

## Método y límites de la evidencia

Wikidata SPARQL se usó para descubrir entidades del país Q786 y entidades geográficas dentro del rectángulo solicitado. Las entidades se consultaron mediante la API de Wikidata en grupos pequeños. Las afirmaciones mínimas se redactaron en ES/EN a partir de su tipo, descripción y relaciones administrativas. Las fuentes de esas fichas enlazan la respuesta API exacta consultada; las coordenadas enlazan la entidad Wikidata y se redondean a cuatro decimales.

Wikipedia ES/EN se consultó mediante /api/rest_v1/page/summary/. En las fuentes con checkedVia, la URL principal identifica la página de Wikipedia y checkedVia identifica la representación REST consultada: httpStatus registra la respuesta de esa API, no una comprobación separada del HTML de la página. Se conservan identificadores, revisiones y hashes de las consultas; se omitieron los párrafos de los artículos para no reproducirlos en la entrega. Los textos de las fichas son redacción propia.

Se volvieron a consultar las fuentes iniciales del Ministerio de Turismo, UNESCO, Minería, Museo Nacional de Historia Natural y el Ayuntamiento de La Vega. Se prefieren esas fuentes cuando respaldan el texto conservado. Las fuentes inaccesibles se registran abajo; sus afirmaciones no se dan por verificadas por el mero hecho de figurar en el seed.

Las licencias se comprobaron en las páginas de archivo de Commons mediante sus revisiones de contenido y los metadatos de licencia extraídos de esas mismas páginas. evidence/file-pages.json conserva el hash de la página, ID de revisión, plantillas de licencia, API y fecha; evidence/media-metadata.json conserva autor, licencia y URL. Se selecciona una licencia permitida cuando hay varias; las variantes territoriales y la versión se conservan. Las plantillas cc-by-sa-all y las relicencias GFDL se aceptan solo cuando los metadatos confirman expresamente CC BY-SA.

Solo se descargan miniaturas reducidas de upload.wikimedia.org, con pausas; no se descargan originales. Los WebP no se amplían, caben en 1200 px y sus miniaturas en 480 px. Las imágenes pequeñas se conservan pequeñas. Los recortes y sustituciones de la revisión se registran en photo-review.json y evidence/photo-review-applied.json. Algunas imágenes ilustran una especie, un alimento, un monumento asociado o un paisaje de una provincia; no se presentan como fotografías de una ceremonia o de una receta dominicana concreta si eso no está documentado.

El catálogo no certifica acceso público, seguridad, apertura, operadores, precios ni condiciones de visita. Un punto de Wikidata puede representar un área y no su entrada. Una provincia asignada por P131 no implica que el elemento se limite a ella: parques, cordilleras y ríos necesitan revisión territorial.

## Fichas por categoría

| Categoría | Fichas |
| --- | ---: |
| beach | 16 |
| craft | 2 |
| food | 14 |
| museum | 10 |
| music | 5 |
| nature | 49 |
| place | 65 |
| region | 101 |
| species | 43 |
| tradition | 8 |

## Cobertura territorial

| Provincia o ámbito | Fichas |
| --- | ---: |
| Ámbito nacional | 67 |
| Ámbito nacional o varias provincias | 38 |
| Azua | 4 |
| Bahoruco | 2 |
| Barahona | 4 |
| Dajabón | 3 |
| Distrito Nacional | 51 |
| Duarte | 5 |
| El Seibo | 1 |
| Elías Piña | 3 |
| Espaillat | 2 |
| Hato Mayor | 4 |
| Hermanas Mirabal | 1 |
| Independencia | 3 |
| La Altagracia | 15 |
| La Romana | 3 |
| La Vega | 11 |
| María Trinidad Sánchez | 4 |
| Monseñor Nouel | 2 |
| Monte Cristi | 3 |
| Monte Plata | 2 |
| Pedernales | 6 |
| Peravia | 7 |
| Puerto Plata | 15 |
| Samaná | 12 |
| San Cristóbal | 3 |
| San José de Ocoa | 2 |
| San Juan | 6 |
| San Pedro de Macorís | 8 |
| Sánchez Ramírez | 5 |
| Santiago | 10 |
| Santiago Rodríguez | 1 |
| Santo Domingo | 6 |
| Valverde | 4 |

## Revisión humana prioritaria

Todas las fichas siguen en draft. Prioridades particulares:

- **mofongo**: Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana.
- **pastelon**: Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana.
- **cocolo**: Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana. Foto de baja resolución de Guloyas, conservada sin ampliación. Revisar identificación y calidad documental.
- **independencia-dominicana**: Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana. Sustituir la pintura por una fotografía contextual del Baluarte del Conde.
- **restauracion-dominicana**: Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana. Sustituir la ilustración de una batalla por la fotografía del monumento conmemorativo de Santiago.
- **tradicion-de-la-altagracia**: Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana. Ilustrar la tradición con una fotografía de la basílica, en lugar de una reproducción pictórica.
- **gran-teatro-del-cibao**: Borrador. Comprobar denominación local y utilidad para el visitante. Texto mínimo derivado de la entidad Wikidata; no implica acceso público. La foto P18 debe revisarse visualmente antes de aprobar. La fotografía inicial fue sustituida tras la revisión visual.
- **monte-cristi**: Borrador. Comprobar denominación local y utilidad para el visitante. Texto mínimo derivado de la entidad Wikidata; no implica acceso público. La foto P18 debe revisarse visualmente antes de aprobar. Identificar la imagen histórica para evitar que se interprete como una vista actual.
- **congos**: Ficha inicial conservada con la misma key. Borrador sujeto a aprobación humana. Fotografía contextual de una estatua de Sixto Minier, no de una ceremonia. Revisar la relación entre monumento y tradición y los derechos de la escultura antes de aprobar.
- **carnaval**: Ficha inicial conservada con la misma key. Borrador sujeto a aprobación humana.
- **quipe-y-kibbeh**: Borrador. Texto redactado a partir del resumen citado. Revisar nombre habitual, relación regional y foto antes de aprobar; las imágenes de especies o alimentos pueden ser ilustrativas y no estar tomadas en la República Dominicana.
- **Especies**: comprobar identificación visual, nombre común y cambios taxonómicos; las fotos de cautiverio o de ejemplares conservados se deben identificar como tales. No se afirman estados actuales de conservación. La ficha Elaenia cherriei quedó excluida por la ambigüedad de la etiqueta taxonómica de su fotografía; la jutía quedó excluida por falta de una fotografía válida.
- **Regiones y provincias**: revisar que la foto sea representativa y que sus límites y su punto geográfico no se interpreten como un punto de acceso.
- **Fichas mínimas de Wikidata**: enriquecer editorialmente antes de publicación; la validación estructural no sustituye la aprobación humana del interés turístico ni una revisión experta de cada dato.

## Fuentes inaccesibles e incidencias de consulta

Los 403 se dejaron sin nuevos intentos por otra vía. Los 429 son límites temporales; se respetaron las pausas y Retry-After y se conservaron los resultados disponibles. Un 404 de Wikipedia en inglés no basta para descartar un tema: se hicieron búsquedas alternativas y consultas en español.

| HTTP | Fuente consultada | Observación |
| --- | --- | --- |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Cabo%20Cabr%C3%B3n%20National%20Park | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Roystonea%20hispaniolana | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Armando%20Berm%C3%BAdez%20National%20Park | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Fun%20Fun%20Cave | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Sanctuary%20of%20Santo%20Cerro | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Mu%C3%B1eca%20sin%20rostro | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Santo%20Domingo%20International%20Book%20Fair | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/National%20Zoological%20Park%20(Dominican%20Republic) | Recurso/título no encontrado |
| 429 | https://en.wikipedia.org/api/rest_v1/page/summary/Ridgway's%20hawk | Límite temporal; Retry-After 20 |
| 429 | https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q515%7CQ644371%7CQ1049757%7CQ8502%7CQ23691%7CQ3146899%7CQ1352536%7CQ1286517%7CQ22698%7CQ107357104%7CQ2390458%7CQ7188%7CQ82117%7CQ178561%7CQ39614%7CQ473972%7CQ18043413%7CQ12280%7CQ19958368%7CQ23397%7CQ486972%7CQ3917681%7CQ2499228%7CQ46195901%7CQ2306612%7CQ162875%7CQ133346%7CQ15104814%7CQ3089219%7CQ12413618%7CQ79007%7CQ33829%7CQ6266%7CQ355304%7CQ481289%7CQ1509831%7CQ1968435%7CQ46970%7CQ17018380%7CQ56242215&props=labels%7Cdescriptions%7Caliases%7Cclaims%7Csitelinks&languages=es%7Cen&format=json | Límite temporal; Retry-After undefined |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Cayos%20Siete%20Hermanos | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Cueva%20del%20Puente | Recurso/título no encontrado |
| 429 | https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q120560%7CQ2977%7CQ1261499%7CQ24398318%7CQ34627%7CQ1076486%7CQ269949%7CQ167346%7CQ288514%7CQ16917%7CQ64578911%7CQ109607%7CQ16970%7CQ3957%7CQ1377575%7CQ123705%7CQ27686%7CQ4671277%7CQ35509%7CQ4989906%7CQ6460735%7CQ2240918%7CQ8465%7CQ549386%7CQ12332021%7CQ63416577%7CQ40080%7CQ5503%7CQ7944%7CQ105390172%7CQ1183%7CQ37901%7CQ1210950%7CQ3831982%7CQ188025%7CQ6341928%7CQ3840823%7CQ317548%7CQ188686%7CQ1772745&props=labels%7Cdescriptions%7Caliases%7Cclaims%7Csitelinks&languages=es%7Cen&format=json | Límite temporal; Retry-After undefined |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Museo%20Hermanas%20Mirabal | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Museo%20del%20Larimar | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Palacio%20de%20Bellas%20Artes%20(Santo%20Domingo) | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Plaza%20de%20la%20Cultura | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Faceless%20dolls | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Parque%20nacional%20El%20Choco | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Chench%C3%A9n | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/San%20Jos%C3%A9%20de%20Los%20Llanos | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Parque%20nacional%20Cabo%20Cabr%C3%B3n | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Chench%C3%A9n | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Pinalito%20Dam | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Laguna%20de%20B%C3%A1varo | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Bajabonico%20River | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Salto%20de%20Baiguate | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Nalga%20de%20Maco | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Festival%20del%20Merengue | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Cayo%20Arena | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Y%C3%A1sica%20River | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Hispaniolan%20sharp-shinned%20hawk | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Loma%20Guaconejo%20Scientific%20Reserve | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Dominican%20jazz | Recurso/título no encontrado |
| 429 | https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File%3A3840px-Brunellia+comocladifolia+3.JPG&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Cmime%7Csha1&iiurlwidth=960&redirects=1 | Límite temporal; Retry-After 3 |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Salto%20de%20Baiguate | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Museo%20del%20%C3%81mbar | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Ridgeway%E2%80%99s%20hawk | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Mercado%20Modelo%20(Santo%20Domingo) | Recurso/título no encontrado |
| 429 | https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q114678353%7CQ114678506%7CQ115430915%7CQ125071301%7CQ125071518%7CQ125072226%7CQ125072833%7CQ125081397%7CQ125131312%7CQ125131946%7CQ125131988%7CQ125469279%7CQ129256608%7CQ130421295%7CQ130553396%7CQ132602885%7CQ132858767%7CQ132858898%7CQ132862846%7CQ133838226%7CQ133887574%7CQ135109080%7CQ135193263%7CQ135494553&props=labels%7Cdescriptions%7Caliases%7Cclaims%7Csitelinks&languages=es%7Cen&format=json | Límite temporal; Retry-After undefined |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Mab%C3%AD | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Loma%20Quita%20Espuela | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Jalao | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Salto%20de%20la%20Jalda | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Guloyas | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Palos%20(m%C3%BAsica) | Recurso/título no encontrado |
| 429 | https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q87563855%7CQ87763080%7CQ93147461%7CQ100507890%7CQ101086000%7CQ104184947%7CQ104531919%7CQ104850354%7CQ105234790%7CQ106921160%7CQ106921205%7CQ106936978%7CQ106959367%7CQ106959591%7CQ106959726%7CQ106959788%7CQ106959814%7CQ106959858%7CQ106959875%7CQ106959925%7CQ106960254%7CQ107040881%7CQ107041036%7CQ107041447%7CQ107043982%7CQ107044033%7CQ107359698%7CQ111721449%7CQ112070734%7CQ112120257%7CQ112664251%7CQ112913523%7CQ112913526%7CQ112913527%7CQ112913524%7CQ112913525%7CQ112913528%7CQ112913529%7CQ113570287%7CQ114037431&props=labels%7Cdescriptions%7Caliases%7Cclaims%7Csitelinks&languages=es%7Cen&format=json | Límite temporal; Retry-After undefined |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Presa%20de%20Hatillo | Recurso/título no encontrado |
| 429 | https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File%3APlaya+Macao+Dominican+Republic.jpg%7CFile%3AAvenida+del+Parque+Mirador+Sur+-+Santo+Domingo.jpg%7CFile%3ACatedral+Santiago+Ap%C3%B3stol-IMG+0136.JPG%7CFile%3APuerto+Plata+Cathedrale.JPG%7CFile%3AMuseoHistoriaNatural.jpg%7CFile%3AIglesia+Santa+Barbara+restaurada+CCSD+06+2019+6090.jpg%7CFile%3ASanto+Domingo+-+Museo+de+%C3%81mbar+0632.JPG%7CFile%3ACCSD+Plaza+Espa%C3%B1a+07+2017+4671.jpg%7CFile%3AMAR+-+Museo+Atarazanas+Reales+CCSD+12+2019+0699.jpg%7CFile%3ASos%C3%BAa+-+Playa+Alicia+0413.JPG%7CFile%3ASosua+Beach+Dominican+Republic.jpg%7CFile%3ASanto+Domingo+-+Casa+de+la+Moneda+0505.jpg%7CFile%3AIglesia+Altagracia+CCSD+09+2018+1429.jpg%7CFile%3ASanto+Domingo+-+Casa+del+Pud%C3%ADn+0756.JPG%7CFile%3ACalle+El+Conde+CCSD+RD+06+2017+2530.jpg&prop=revisions&rvprop=ids%7Ccontent&rvslots=main&redirects=1 | Límite temporal; Retry-After 7 |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Museo%20del%20Larimar | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Laguna%20Lim%C3%B3n | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Museo%20de%20Arte%20Moderno%20(Rep%C3%BAblica%20Dominicana) | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Cueva%20Fun%20Fun | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Rinc%C3%B3n%20Dam | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Museo%20Hermanas%20Mirabal | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Dunas%20de%20Ban%C3%AD | Recurso/título no encontrado |
| 429 | https://en.wikipedia.org/api/rest_v1/page/summary/Dominican%20Republic%20Jazz%20Festival | Límite temporal; Retry-After 11 |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Loma%20Isabel%20de%20Torres | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Cayo%20Arena | Recurso/título no encontrado |
| 0 | https://museosrd.gob.do/museos/amber-world-museum/ | TypeError: fetch failed |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Las%20Calderas%20Bay | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Valdesia%20Dam | Recurso/título no encontrado |
| 403 | https://whc.unesco.org/en/list/526/ | Acceso bloqueado; no evadido |
| 429 | https://en.wikipedia.org/api/rest_v1/page/summary/El%20Choco%20National%20Park | Límite temporal; Retry-After 11 |
| 429 | https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q786%7CQ1061151%7CQ46831%7CQ4438121%7CQ193622%7CQ498452%7CQ1008456%7CQ5135744%7CQ163740%7CQ43229%7CQ109288804%7CQ55753593%7CQ26213387%7CQ4022%7CQ1531518%7CQ41710%7CQ1643989%7CQ8142%7CQ244696%7CQ1377943%7CQ1366107%7CQ6005581%7CQ744913%7CQ811430%7CQ2198484%7CQ19413015%7CQ23442%7CQ913337%7CQ677678%7CQ1549591%7CQ1323353%7CQ46169%7CQ63418223%7CQ1137545%7CQ902814%7CQ17898%7CQ33506%7CQ1785071%7CQ1248784%7CQ94993988&props=labels%7Cdescriptions%7Caliases%7Cclaims%7Csitelinks&languages=es%7Cen&format=json | Límite temporal; Retry-After undefined |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Sabana%20Yegua%20Dam | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Salto%20de%20la%20Jalda | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Jalao | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Museo%20de%20Arte%20Moderno%20(Santo%20Domingo) | Recurso/título no encontrado |
| 429 | https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=Armando+Berm%C3%BAdez+National+Park%7CJos%C3%A9+del+Carmen+Ram%C3%ADrez+National+Park%7CSierra+de+Bahoruco+National+Park%7CLos+Haitises+National+Park%7CCabo+Cabr%C3%B3n+National+Park%7CEl+Choco+National+Park%7CLoma+Quita+Espuela%7CLoma+Guaconejo+Scientific+Reserve%7CLoma+Isabel+de+Torres%7CCayo+Arena%7CCayos+Siete+Hermanos%7CCach%C3%B3n+de+la+Rubia%7CSalto+de+la+Jalda%7CSalto+de+Baiguate%7CFun+Fun+Cave%7CCueva+del+Puente%7CDunas+de+Ban%C3%AD%7CLas+Calderas+Bay%7CLaguna+B%C3%A1varo%7CLaguna+Lim%C3%B3n%7CLaguna+Redonda%7CNizao+River%7CCam%C3%BA+River%7CBajabonico+River%7CY%C3%A1sica+River%7CNigua+River%7COcoa+River%7CCordillera+Septentrional%7CLoma+Alto+de+la+Bandera%7CNalga+de+Maco&props=labels%7Cdescriptions%7Caliases%7Cclaims%7Csitelinks&languages=es%7Cen&format=json | Límite temporal; Retry-After 14 |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Cach%C3%B3n%20de%20la%20Rubia | Recurso/título no encontrado |
| 404 | https://es.wikipedia.org/api/rest_v1/page/summary/Loma%20Isabel%20de%20Torres | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Laguna%20Lim%C3%B3n | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Laguna%20B%C3%A1varo | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Salve%20(Dominican%20music) | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/National%20Aquarium%20of%20the%20Dominican%20Republic | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Museo%20Gregorio%20Luper%C3%B3n | Recurso/título no encontrado |
| 429 | https://en.wikipedia.org/api/rest_v1/page/summary/Eastern%20chat-tanager | Límite temporal; Retry-After 11 |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Jos%C3%A9%20del%20Carmen%20Ram%C3%ADrez%20National%20Park | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Catib%C3%ADa | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Parque%20Independencia | Recurso/título no encontrado |
| 404 | https://en.wikipedia.org/api/rest_v1/page/summary/Magnolia%20domingensis | Recurso/título no encontrado |

5 incidencias de miniaturas conservadas en evidence/download-failures/. Una miniatura fallida no se registra como foto válida. Los descartes finales se deduplican por entidad o clave; las incidencias recuperadas se separan de los descartes.

## Tabla completa de fichas

| key | Título ES | Fuentes | Imágenes | Ubicación |
| --- | --- | ---: | ---: | --- |
| cordillera-central | Cordillera Central | 1 | 1 | sí |
| banco-de-la-plata | Banco de la Plata | 1 | 1 | no |
| san-cristobal | San Cristóbal | 1 | 1 | sí |
| altos-chavon | Altos de Chavón | 2 | 1 | sí |
| cabarete | Cabarete | 1 | 1 | sí |
| isla-catalina | Isla Catalina | 1 | 1 | sí |
| sanchez | Sánchez | 1 | 1 | sí |
| provincia-de-espaillat | Provincia de Espaillat | 1 | 1 | no |
| la-vega | La Vega | 1 | 1 | sí |
| samana | Samaná | 1 | 1 | sí |
| parque-nacional-cotubanama | Parque nacional Cotubanamá | 1 | 1 | sí |
| provincia-de-la-vega | Provincia de La Vega | 1 | 1 | no |
| san-rafael-del-yuma | San Rafael del Yuma | 1 | 1 | sí |
| alcazar-de-colon | Alcázar de Colón | 1 | 1 | sí |
| san-pedro-de-macoris | San Pedro de Macorís | 1 | 1 | sí |
| mao | Mao | 1 | 1 | sí |
| provincia-de-puerto-plata | Provincia de Puerto Plata | 1 | 1 | no |
| estadio-olimpico-felix-sanchez | Estadio Olímpico Félix Sánchez | 1 | 1 | sí |
| rio-yaque-del-norte | río Yaque del Norte | 1 | 1 | sí |
| provincia-de-azua | Provincia de Azua | 1 | 1 | no |
| provincia-de-bahoruco | Provincia de Bahoruco | 1 | 1 | no |
| boca-chica | Boca Chica | 1 | 1 | sí |
| puerta-de-la-misericordia-santo-domingo | Puerta de la Misericordia, Santo Domingo | 1 | 1 | sí |
| cementerio-de-la-avenida-independencia | Cementerio de la Avenida Independencia | 1 | 1 | sí |
| parque-nacional-submarino-la-caleta | Parque Nacional Submarino La Caleta | 1 | 1 | sí |
| rio-jimenoa | Río Jimenoa | 1 | 1 | sí |
| santo-domingo-este | Santo Domingo Este | 1 | 1 | sí |
| rio-chavon | Río Chavón | 1 | 1 | sí |
| palacio-nacional | Palacio Nacional | 1 | 1 | sí |
| el-limon | El Limón | 1 | 1 | sí |
| cabrera | Cabrera | 1 | 1 | sí |
| cambita-garabitos | Cambita Garabitos | 1 | 1 | sí |
| rio-yaque-del-sur | Río Yaque del Sur | 1 | 1 | sí |
| constanza-republica-dominicana | Constanza, República Dominicana | 1 | 1 | sí |
| comendador | Comendador | 1 | 1 | sí |
| san-francisco-de-macoris | San Francisco de Macorís | 1 | 1 | sí |
| valle-nuevo | Valle Nuevo | 1 | 1 | sí |
| don-gregorio | Don Gregorio | 1 | 1 | sí |
| mangu | Mangú | 3 | 1 | no |
| sancocho | Sancocho | 2 | 1 | no |
| chicharron | Chicharrón | 2 | 1 | no |
| habichuelas-con-dulce | Habichuelas con dulce | 2 | 1 | no |
| tostones | Tostones | 2 | 1 | no |
| mofongo | Mofongo | 2 | 1 | no |
| casabe | Casabe | 2 | 1 | no |
| moro-de-guandules | Moro de guandules | 2 | 1 | no |
| dulce-de-leche | Dulce de leche | 2 | 1 | no |
| bahia-de-las-aguilas | Bahía de las Águilas | 1 | 1 | sí |
| catedral-primada-de-america | Catedral Primada de América | 1 | 1 | sí |
| basilica-catedral-y-santuario-nacional-de-nuestra-senora-de-la-altagracia | Basílica Catedral y Santuario Nacional de Nuestra Señora de la Altagracia | 1 | 1 | sí |
| centro-olimpico-juan-pablo-duarte | Centro Olímpico Juan Pablo Duarte | 2 | 1 | sí |
| centro-de-los-heroes | Centro de los Héroes | 1 | 1 | sí |
| jardin-botanico-nacional-de-santo-domingo | Jardín Botánico Nacional de Santo Domingo | 1 | 1 | sí |
| hospital-san-nicolas-de-bari | Hospital San Nicolás de Bari | 1 | 1 | sí |
| iglesia-del-convento-dominico-santo-domingo-de-guzman | iglesia del Convento Dominico (Santo Domingo de Guzmán) | 1 | 1 | sí |
| reserva-cientifica-natural-lagunas-redonda-y-limon | reserva científica natural lagunas Redonda y Limón | 1 | 1 | sí |
| locrio | Locrio | 2 | 1 | no |
| pastelon | Pastelón | 2 | 1 | no |
| chimichurri-dominicano | Chimichurri dominicano | 2 | 1 | no |
| gastronomia-dominicana | Gastronomía dominicana | 2 | 1 | no |
| merengue | Merengue | 3 | 1 | no |
| bachata | Bachata | 3 | 1 | no |
| merengue-tipico | Merengue típico | 3 | 1 | no |
| guira | Güira | 2 | 1 | no |
| tambora-dominicana | Tambora dominicana | 2 | 1 | no |
| parque-nacional-cueva-de-las-maravillas | Parque nacional Cueva de las Maravillas | 1 | 1 | sí |
| parque-nacional-isla-cabritos | Parque nacional Isla Cabritos | 1 | 1 | sí |
| plaza-de-la-bandera | Plaza de la Bandera | 1 | 1 | sí |
| santa-cruz-de-barahona | Santa Cruz de Barahona | 1 | 1 | sí |
| juan-dolio | Juan Dolio | 1 | 1 | sí |
| higuey | Higüey | 2 | 1 | sí |
| salcedo | Salcedo | 1 | 1 | sí |
| provincia-de-barahona | Provincia de Barahona | 1 | 1 | no |
| cocolo | Teatro Cocolo Danzante | 3 | 1 | no |
| independencia-dominicana | Independencia dominicana | 3 | 1 | no |
| restauracion-dominicana | Restauración dominicana | 3 | 1 | no |
| tradicion-de-la-altagracia | Tradición de la Altagracia | 3 | 1 | no |
| beisbol-dominicano | Béisbol dominicano | 2 | 1 | no |
| lidom | LIDOM | 3 | 1 | no |
| larimar | Larimar | 3 | 1 | no |
| ambar | Ámbar dominicano | 2 | 1 | no |
| provincia-de-samana | Provincia de Samaná | 1 | 1 | no |
| bayahibe | Bayahíbe | 1 | 1 | sí |
| moca | Moca | 1 | 1 | sí |
| provincia-de-duarte | Provincia de Duarte | 1 | 1 | no |
| provincia-de-monsenor-nouel | Provincia de Monseñor Nouel | 1 | 1 | no |
| playa-encuentro | Playa Encuentro | 1 | 1 | sí |
| provincia-de-peravia | Provincia de Peravia | 1 | 1 | no |
| isla-saona | Isla Saona | 1 | 1 | sí |
| cotorra-de-la-espanola | Cotorra de La Española | 2 | 1 | no |
| solenodonte-de-la-espanola | Solenodonte de La Española | 2 | 1 | no |
| priotelus-roseigaster | Priotelus roseigaster | 2 | 1 | no |
| todus-subulatus | Todus subulatus | 2 | 1 | no |
| todus-angustirostris | Todus angustirostris | 2 | 1 | no |
| melanerpes-striatus | Melanerpes striatus | 2 | 1 | no |
| aratinga-de-la-espanola | Aratinga de La Española | 2 | 1 | no |
| coccyzus-longirostris | Coccyzus longirostris | 2 | 1 | no |
| provincia-de-pedernales | Provincia de Pedernales | 1 | 1 | no |
| provincia-de-san-pedro-de-macoris | Provincia de San Pedro de Macorís | 1 | 1 | no |
| jimani | Jimaní | 1 | 1 | sí |
| canal-de-la-mona | Canal de la Mona | 1 | 1 | no |
| provincia-de-san-jose-de-ocoa | Provincia de San José de Ocoa | 1 | 1 | no |
| provincia-de-independencia | Provincia de Independencia | 1 | 1 | no |
| la-isabela | La Isabela | 1 | 1 | sí |
| punta-cana | Punta Cana | 1 | 1 | sí |
| tyto-glaucops | Tyto glaucops | 2 | 1 | no |
| antrostomus-ekmani | Antrostomus ekmani | 2 | 1 | no |
| anthracothorax-dominicus | Anthracothorax dominicus | 2 | 1 | no |
| riccordia-swainsoni | Riccordia swainsoni | 2 | 1 | no |
| nesoctites-micromegas | Nesoctites micromegas | 2 | 1 | no |
| corvus-leucognaphalus | Corvus leucognaphalus | 2 | 1 | no |
| geotrygon-leucometopia | Geotrygon leucometopia | 2 | 1 | no |
| coccyzus-rufigularis | Coccyzus rufigularis | 2 | 1 | no |
| icterus-dominicensis | Icterus dominicensis | 2 | 1 | no |
| laguna-salada | Laguna Salada | 1 | 1 | sí |
| bayaguana | Bayaguana | 1 | 1 | sí |
| san-antonio-de-guerra | San Antonio de Guerra | 1 | 1 | sí |
| las-guaranas | Las Guáranas | 1 | 1 | sí |
| templo-de-santo-domingo | Templo de Santo Domingo | 1 | 1 | sí |
| laguna-de-oviedo | Laguna de Oviedo | 1 | 1 | sí |
| peralta | Peralta | 1 | 1 | sí |
| quisqueya | Quisqueya | 1 | 1 | sí |
| sabana-de-la-mar | Sabana de la Mar | 1 | 1 | sí |
| vallejuelo | Vallejuelo | 1 | 1 | sí |
| salto-el-limon | Salto El Limón | 1 | 1 | sí |
| villa-vasquez | Villa Vásquez | 1 | 1 | sí |
| tabara-arriba | Tábara Arriba | 1 | 1 | sí |
| banica | Bánica | 1 | 1 | sí |
| playa-rincon | Playa Rincón | 1 | 1 | sí |
| playa-punta-rucia | Playa Punta Rucia | 1 | 1 | sí |
| laguna-salada-q23762354 | Laguna Salada | 1 | 1 | sí |
| xenoligea-montana | Xenoligea montana | 2 | 1 | no |
| microligea-palustris | Microligea palustris | 2 | 1 | no |
| tangara-haitiana | Tangara haitiana | 2 | 1 | no |
| spindalis-dominicensis | Spindalis dominicensis | 2 | 1 | no |
| loxia-megaplaga | Loxia megaplaga | 2 | 1 | no |
| turdus-swalesi | Turdus swalesi | 2 | 1 | no |
| solitario-gorgirrufo | Solitario gorgirrufo | 2 | 1 | no |
| tachycineta-euchrysea | Tachycineta euchrysea | 2 | 1 | no |
| contopus-hispaniolensis | Contopus hispaniolensis | 2 | 1 | no |
| vireo-nanus | Vireo nanus | 2 | 1 | no |
| corvus-palmarum | Corvus palmarum | 2 | 1 | no |
| eufonia-antillana | Eufonia antillana | 2 | 1 | no |
| cyclura-cornuta | Cyclura cornuta | 2 | 1 | no |
| cyclura-ricordii | Cyclura ricordii | 2 | 1 | no |
| chilabothrus-striatus | Chilabothrus striatus | 1 | 1 | no |
| pinus-occidentalis | Pinus occidentalis | 1 | 1 | no |
| leuenbergeria-quisqueyana | Leuenbergeria quisqueyana | 1 | 1 | no |
| playa-madama | Playa Madama | 1 | 1 | sí |
| rio-maimon | Río Maimón | 1 | 1 | sí |
| salto-de-jimenoa-uno | Salto de Jimenoa Uno | 1 | 1 | sí |
| playa-dorada | Playa Dorada | 1 | 1 | sí |
| playa-bonita | Playa Bonita | 1 | 1 | sí |
| las-caritas | Las Caritas | 1 | 1 | sí |
| museo-del-hombre-dominicano | Museo del Hombre Dominicano | 1 | 1 | sí |
| catedral-inmaculada-concepcion | Catedral Inmaculada Concepción | 2 | 1 | sí |
| archivo-general-de-la-nacion | Archivo General de la Nación | 1 | 1 | sí |
| gran-teatro-del-cibao | Gran Teatro del Cibao | 1 | 1 | sí |
| swietenia-mahagoni | Swietenia mahagoni | 2 | 1 | no |
| coccothrinax-argentea | Coccothrinax argentea | 2 | 1 | no |
| magnolia-pallescens | Magnolia pallescens | 2 | 1 | no |
| hispaniolan-slider | Hispaniolan slider | 1 | 1 | no |
| haitises | Parque Nacional Los Haitises | 3 | 1 | sí |
| centro-cultural-eduardo-leon-jimenes | Centro Cultural Eduardo León Jimenes | 1 | 1 | no |
| provincia-de-santiago | Provincia de Santiago | 1 | 1 | no |
| provincia-de-valverde | Provincia de Valverde | 1 | 1 | no |
| las-terrenas | Las Terrenas | 1 | 1 | sí |
| municipio-de-azua | Municipio de Azua | 1 | 1 | sí |
| provincia-de-sanchez-ramirez | Provincia de Sánchez Ramírez | 1 | 1 | no |
| rio-yuna | río Yuna | 1 | 1 | sí |
| bani | Baní | 1 | 1 | sí |
| provincia-de-maria-trinidad-sanchez | Provincia de María Trinidad Sánchez | 1 | 1 | no |
| dajabon | Dajabón | 1 | 1 | sí |
| baluarte-del-conde | Baluarte del Conde | 1 | 1 | sí |
| provincia-de-san-juan | Provincia de San Juan | 1 | 1 | no |
| provincia-de-santiago-rodriguez | Provincia de Santiago Rodríguez | 1 | 1 | no |
| bahia-de-samana | Bahía de Samaná | 1 | 1 | sí |
| san-jose-de-ocoa | San José de Ocoa | 1 | 1 | sí |
| monte-cristi | Monte Cristi | 1 | 1 | sí |
| altar-de-la-patria | Altar de la Patria | 1 | 1 | sí |
| peninsula-de-samana | Península de Samaná | 1 | 1 | sí |
| sierra-de-neiba | Sierra de Neiba | 1 | 1 | sí |
| nagua | Nagua | 1 | 1 | sí |
| sierra-de-bahoruco | Sierra de Bahoruco | 1 | 1 | sí |
| hato-mayor | Hato Mayor | 1 | 1 | sí |
| san-juan | San Juan | 1 | 1 | sí |
| ciudad-colonial | Ciudad Colonial de Santo Domingo | 2 | 1 | sí |
| fortaleza-ozama | Fortaleza Ozama | 1 | 1 | sí |
| pedernales | Pedernales | 1 | 1 | sí |
| estadio-julian-javier | Estadio Julián Javier | 1 | 1 | sí |
| estadio-quisqueya-juan-marichal | Estadio Quisqueya Juan Marichal | 1 | 1 | sí |
| estadio-tetelo-vargas | Estadio Tetelo Vargas | 1 | 1 | sí |
| fortaleza-de-san-felipe | Fortaleza de San Felipe | 1 | 1 | sí |
| fortaleza-san-luis | Fortaleza San Luis | 1 | 1 | sí |
| casa-del-cordon | Casa del Cordón | 1 | 1 | sí |
| rio-jayaco | Río Jayaco | 1 | 1 | sí |
| la-caleta | La Caleta | 1 | 1 | sí |
| monasterio-de-san-francisco | Monasterio de San Francisco | 1 | 1 | sí |
| parque-nacional-monte-cristi | Parque nacional Monte Cristi | 1 | 1 | sí |
| monumento-de-santiago | Monumento de Santiago | 1 | 1 | sí |
| panteon-de-la-patria | Panteón de la Patria | 1 | 1 | sí |
| casona-de-palave | Casona de Palavé | 1 | 1 | sí |
| parque-colon-santo-domingo | Parque Colón (Santo Domingo) | 1 | 1 | sí |
| reales-atarazanas-de-santo-domingo | Reales Atarazanas de Santo Domingo | 1 | 1 | sí |
| sabana-buey | Sabana Buey | 1 | 1 | sí |
| congos | Congos de Villa Mella | 2 | 1 | no |
| ballenas | Ballenas jorobadas de Samaná | 1 | 1 | no |
| carnaval | Carnaval de La Vega | 1 | 1 | no |
| rio-soco | Río Soco | 1 | 1 | sí |
| teatro-nacional-eduardo-brito | Teatro Nacional Eduardo Brito | 1 | 1 | sí |
| rio-yuma | Río Yuma | 1 | 1 | sí |
| museo-casa-duarte | Museo Casa Duarte | 1 | 1 | no |
| parque-nacional-jaragua | Parque nacional Jaragua | 1 | 1 | sí |
| la-vega-vieja | La Vega Vieja | 1 | 1 | sí |
| centro-historico-de-puerto-plata | Centro histórico de Puerto Plata | 1 | 1 | sí |
| rio-el-limon | Río El Limón | 1 | 1 | no |
| quipe-y-kibbeh | Quipe y kibbeh | 3 | 1 | no |
| phaenicophilus-palmarum | Phaenicophilus palmarum | 2 | 1 | no |
| cocodrilo-de-tumbes | cocodrilo de Tumbes | 2 | 1 | no |
| trachemys-stejnegeri | Trachemys stejnegeri | 2 | 1 | no |
| parque-nacional-sierra-de-bahoruco | Parque nacional Sierra de Bahoruco | 2 | 1 | sí |
| platanal-cotui | Platanal Cotuí | 1 | 1 | sí |
| zambrana-abajo | Zambrana Abajo | 1 | 1 | sí |
| quitasueno | Quitasueño | 1 | 1 | sí |
| catedral-nuestra-senora-de-regla | Catedral Nuestra Señora de Regla | 1 | 1 | sí |
| catedral-san-juan-bautista | Catedral San Juan Bautista | 1 | 1 | sí |
| catedral-san-pedro-apostol | Catedral San Pedro Apóstol | 1 | 1 | sí |
| catedral-santa-ana | Catedral Santa Ana | 1 | 1 | sí |
| hoyo-azul | Hoyo Azul | 1 | 1 | sí |
| la-espanola | La Española | 1 | 1 | no |
| las-galeras | Las Galeras | 2 | 1 | sí |
| monte-plata | Monte Plata | 2 | 1 | sí |
| cotui | Cotuí | 2 | 1 | sí |
| neiba | Neiba | 2 | 1 | sí |
| loma-de-cabrera | Loma de Cabrera | 2 | 1 | sí |
| san-jose-de-las-matas | San José de las Matas | 2 | 1 | sí |
| janico | Jánico | 2 | 1 | sí |
| la-romana | La Romana | 1 | 1 | sí |
| santiago-de-los-caballeros | Santiago de los Caballeros | 1 | 1 | sí |
| monumento-natural-lagunas-cabarete-y-goleta | monumento Natural Lagunas Cabarete y Goleta | 1 | 1 | sí |
| playa-macao | Playa Macao | 1 | 1 | sí |
| parque-mirador-sur-santo-domingo | Parque Mirador Sur - Santo Domingo | 1 | 1 | no |
| catedral-de-santiago-apostol-santiago-de-los-caballeros | Catedral de Santiago Apóstol (Santiago de los Caballeros) | 1 | 1 | sí |
| catedral-de-san-felipe-apostol-puerto-plata | Catedral de San Felipe Apóstol (Puerto Plata) | 1 | 1 | sí |
| museo-nacional-de-historia-natural-prof-eugenio-de-jesus-marcano | Museo Nacional de Historia Natural Prof. Eugenio de Jesus Marcano | 1 | 1 | sí |
| catedral-castrense-santa-barbara | Catedral Castrense Santa Bárbara | 1 | 1 | sí |
| pico-duarte | Pico Duarte | 1 | 1 | sí |
| museo-memorial-de-la-resistencia-dominicana | Museo Memorial de la Resistencia Dominicana | 1 | 1 | sí |
| provincia-de-san-cristobal | Provincia de San Cristóbal | 2 | 1 | no |
| provincia-de-el-seibo | Provincia de El Seibo | 2 | 1 | no |
| provincia-de-hato-mayor | Provincia de Hato Mayor | 2 | 1 | no |
| provincia-de-la-altagracia | Provincia de La Altagracia | 2 | 1 | no |
| provincia-de-elias-pina | Provincia de Elías Piña | 2 | 1 | no |
| puente-matias-ramon-mella | Puente Matías Ramón Mella | 1 | 1 | sí |
| faro-a-colon | Faro a Colón | 1 | 1 | sí |
| provincia-de-monte-cristi | Provincia de Monte Cristi | 2 | 1 | no |
| municipio-consuelo | Municipio Consuelo | 1 | 1 | sí |
| sinagoga-de-santo-domingo | Sinagoga de Santo Domingo | 1 | 1 | sí |
| rio-higuamo | Río Higuamo | 1 | 1 | sí |
| puerto-plata | Puerto Plata | 1 | 1 | sí |
| jarabacoa | Jarabacoa | 1 | 1 | sí |
| provincia-de-dajabon | Provincia de Dajabón | 1 | 1 | no |
| metro-de-santo-domingo | Metro de Santo Domingo | 1 | 1 | sí |
| lago-enriquillo | Lago Enriquillo | 1 | 1 | sí |
| sosua | Sosúa | 1 | 1 | sí |
| esperanza | Esperanza | 1 | 1 | sí |
| oviedo | Oviedo | 1 | 1 | sí |
| nizao | Nizao | 1 | 1 | sí |
| cayo-levantado | Cayo Levantado | 1 | 1 | sí |
| bohechio | Bohechío | 1 | 1 | sí |
| jiguey-dam | Jigüey Dam | 1 | 1 | sí |
| museo-de-las-casas-reales | Museo de las Casas Reales | 1 | 1 | no |
| bonao | Bonao | 1 | 1 | sí |
| bavaro | Bávaro | 1 | 1 | sí |
| cordillera-oriental | Cordillera Oriental | 1 | 1 | sí |
| estadio-cibao | Estadio Cibao | 1 | 1 | sí |
| puente-mauricio-baez | puente Mauricio Báez | 1 | 1 | sí |
| puente-juan-bosch | Puente Juan Bosch | 1 | 1 | sí |
| rio-baiguate | Río Baiguate | 1 | 1 | sí |
| teleferico-de-santo-domingo | Teleférico de Santo Domingo | 1 | 1 | no |
| isla-beata | Isla Beata | 1 | 1 | sí |
| santo-domingo | Santo Domingo | 1 | 1 | sí |
| puente-juan-pablo-duarte | Puente Juan Pablo Duarte | 1 | 1 | sí |
| museo-de-ambar | Museo de Ámbar | 1 | 1 | sí |
| plaza-de-espana | Plaza de España | 1 | 1 | sí |
| museo-de-las-atarazanas-reales | Museo de las Atarazanas Reales | 1 | 1 | sí |
| playa-alicia | Playa Alicia | 1 | 1 | sí |
| playa-sosua | Playa Sosúa | 1 | 1 | sí |
| casa-de-la-moneda | Casa de la Moneda | 1 | 1 | sí |
| iglesia-nuestra-senora-de-la-altagracia | iglesia Nuestra Señora de la Altagracia | 1 | 1 | sí |
| casa-del-pudin | Casa del Pudín | 1 | 1 | sí |
| edificio-savinon | Edificio Saviñón | 1 | 1 | sí |
| edificio-diez | Edificio Diez | 1 | 1 | sí |
| edificio-baquero | Edificio Baquero | 1 | 1 | sí |
| edificio-cerame | Edificio Cerame | 1 | 1 | sí |
| edificio-elmudesi | Edificio Elmúdesi | 1 | 1 | sí |
| casa-de-tostado | Casa de Tostado | 1 | 1 | sí |
| palacio-consistorial | Palacio Consistorial | 1 | 1 | sí |
| puerta-de-las-atarazanas-reales | Puerta de las Atarazanas Reales | 1 | 1 | sí |
| capilla-de-nuestra-senora-de-los-remedios | Capilla de Nuestra Señora de los Remedios | 1 | 1 | sí |
| iglesia-regina-angelorum | iglesia Regina Angelorum | 1 | 1 | sí |
| obelisco-de-santo-domingo | Obelisco de Santo Domingo | 1 | 1 | sí |
| playa-arena-gorda | Playa Arena Gorda | 1 | 1 | sí |
| 27-charcos-de-damajagua | 27 Charcos de Damajagua | 1 | 1 | sí |
| playa-fronton | Playa Frontón | 1 | 1 | sí |
| playa-cabarete | Playa Cabarete | 1 | 1 | sí |
| playa-coson | Playa Cosón | 1 | 1 | sí |
| playa-bayahibe | Playa Bayahíbe | 1 | 1 | sí |
| laguna-el-dudu | Laguna El Dudú | 1 | 1 | sí |
| playa-bavaro | Playa Bávaro | 1 | 1 | sí |
| cigua-palmera | Cigua palmera | 1 | 1 | no |
| dunas-de-bani | Dunas de Baní | 1 | 1 | no |
| luperon | Luperón | 1 | 1 | sí |

## Validación ejecutada

Comando: node data/catalog/validate.mjs

```json
{
  "result": "PASS",
  "checkedAt": "2026-11-11T16:12:06.965Z",
  "entries": 313,
  "photos": 313,
  "locations": 204,
  "coveredProvinces": 32,
  "provinceValues": [
    "Azua",
    "Bahoruco",
    "Barahona",
    "Dajabón",
    "Distrito Nacional",
    "Duarte",
    "El Seibo",
    "Elías Piña",
    "Espaillat",
    "Hato Mayor",
    "Hermanas Mirabal",
    "Independencia",
    "La Altagracia",
    "La Romana",
    "La Vega",
    "María Trinidad Sánchez",
    "Monseñor Nouel",
    "Monte Cristi",
    "Monte Plata",
    "Pedernales",
    "Peravia",
    "Puerto Plata",
    "Samaná",
    "San Cristóbal",
    "San José de Ocoa",
    "San Juan",
    "San Pedro de Macorís",
    "Santiago",
    "Santiago Rodríguez",
    "Santo Domingo",
    "Sánchez Ramírez",
    "Valverde",
    "Ámbito nacional",
    "Ámbito nacional o varias provincias"
  ],
  "imageDirectoryBytes": 33429902,
  "referencedImageBytes": 33429902,
  "errors": []
}
```

El validador usa únicamente módulos nativos de Node. Comprueba estructura, identificadores, claves únicas, campos ES/EN, tipos e intereses, fuentes HTTPS, ausencia de precios/horas/URLs en los textos, archivos y dimensiones WebP, tamaños, ubicación y claves iniciales. La verificación semántica y visual se documenta por separado en evidence/visual-review.md.

## Auditoría de procedencia

PASS — 313 fichas; 313 imágenes contrastadas con su atribución, hashes, miniatura descargada, página de Commons y respuesta de fuente conservada. Errores: []

Carnaval de La Vega conserva wikidata: null porque no se identificó una entidad específica para la fiesta regional. La fuente verificada es el Ayuntamiento de La Vega; no se inventó un QID ni se sustituyó por el del carnaval nacional.

Las dos pasadas visuales y la revisión adicional posterior a las correcciones constan en [el registro visual](evidence/visual-review.md). Las exclusiones y las fichas mínimas se entregan para revisión; el catálogo no pretende agotar todos los ejemplos de la guía.
