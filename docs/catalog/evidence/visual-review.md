# Revisión de las fotografías del catálogo 10A

Esta es una investigación de datos. No se modificó ni se verificó la interfaz de Ary.

## Inspección preliminar 1 — 2026-11-11

Se abrió y miró `pass1/sheet-01.jpg` con diez fotografías. Cordillera Central, Banco de la Plata, San Cristóbal, Altos de Chavón, Cabarete, Isla Catalina, Sánchez y Samaná muestran el tema o un elemento contextual reconocible. La relación documental sigue dependiendo de la descripción de Commons y de la entidad citada.

Problemas encontrados:

- `la-vega`: aparecen transeúntes en la parte inferior de la fotografía de la catedral. Pendiente excluir el primer plano mediante recorte y volver a inspeccionar el archivo final.
- `provincia-de-espaillat`: la imagen es un paisaje de árboles. Pendiente confirmar en la página del archivo que se documenta esa provincia; el título de archivo por sí solo no basta.
- Varios originales pequeños no produjeron una URL de miniatura en la primera consulta. Se corrigió el recolector para solicitar un tamaño inferior al original; las fichas afectadas se vuelven a procesar.

Este registro se ampliará con las hojas siguientes y la revisión final. La generación de una hoja no equivale a haberla revisado.

## Primera pasada completa y selección de alternativas

Se abrieron y miraron las 17 hojas de `pass1/`, que registran la selección preliminar. Se examinaron después las dos hojas `new-selections/` para contrastar fotografías alternativas y recortes. Las hojas se generaron de nuevo al incorporar lotes; sus manifiestos identifican claves y hashes.

Se encontraron y resolvieron estos grupos de problemas:

- Retratos privados o personas en primer plano: se excluyeron Las Colinas, El Seibo y Villa Tapia; se recortaron la catedral de La Vega, la elaboración de casabe, el carrito de chimichurris, Playa Sosúa, Salto El Limón y Damajagua. Villa Tapia también tenía una fotografía de un desfile sin identificación suficiente de esa localidad.
- Mapas, capturas cartográficas, logotipos y reproducciones: se sustituyeron las imágenes del Centro Olímpico, LIDOM, Independencia, Restauración y la tradición de la Altagracia. Se excluyeron Río Camú, Cibao, Gran Arena del Cibao y Museo Bellapart al no completar una alternativa válida en esta ejecución.
- Jutía: las alternativas encontradas eran una ilustración histórica y un mapa. La ficha se excluyó de los borradores completos.
- Identificación biológica: se excluyó Audantia/Anolis cybotes porque la fuente consultada circunscribe el taxón actual a Haití. Elaenia cherriei quedó excluida por el uso del nombre del complejo taxonómico anterior en la fotografía. Se sustituyeron las ilustraciones de la golondrina y de la eufonia por fotografías documentadas.
- Se sustituyeron la foto mixta de chicharrón y la imagen de habichuelas con una etiqueta de precio. La foto nueva de habichuelas es una fotografía propia documentada en Commons, fechada en 2020. El chicharrón fotografiado corresponde a una preparación boliviana y se identifica como imagen ilustrativa.
- La imagen de Espaillat se confirmó por la descripción y la categoría de Commons. Las imágenes de Samaná para ballenas, de la estatua de Sixto Minier para Congos y de la escultura de Lope de Vega para Gran Teatro se identificaron como contextuales.
- Se corrigieron textos que confundían un municipio con su provincia. La imagen de Monte Plata se contrastó de nuevo con el archivo final después de resolver una colisión de nombres internos.

Las acciones individualizadas, motivos, recortes y sustituciones están en `data/catalog/photo-review.json`, `evidence/photo-review-applied.json`, `evidence/photo-replacements.json` y `evidence/editorial-corrections.json`.

## Segunda pasada real — conjunto completo

Se generaron desde los archivos locales vigentes y se abrieron y miraron las 16 hojas de `pass2/`. Se recorrieron sus imágenes, claves y contexto, incluyendo las fotografías de alimentos, edificios, paisajes, instrumentos y especies. La revisión comprende correspondencia temática, encuadre, texto alternativo, personas, mapas/logotipos e imágenes históricas. No constituye una identificación biológica experta ni una aprobación de publicación.

Esta pasada encontró incidencias adicionales: una espectadora en el primer plano del merengue típico, personas en la calle de Higüey y en Duvergé, y personas próximas a los bordes de las fotos de Estadio Cibao, Bonao y Playa Bávaro. Se sustituyeron merengue típico e Higüey por imágenes contextuales documentadas; se excluyó Duvergé y se recortaron las otras tres fotografías.

## Comprobación final después de esas correcciones

Se volvieron a generar, abrir y mirar las dos hojas de `final-corrections/`, con 32 selecciones afectadas o incorporadas durante la revisión. Los cinco cambios de imagen posteriores a la segunda pasada quedaron inspeccionados en su versión final. Los recortes excluyen los rostros señalados; las sustituciones muestran el instrumento y la basílica citados. Duvergé ya no se cuenta ni conserva imágenes públicas en el catálogo.

El resultado final es de **313 fichas**. Los archivos restantes no cambiaron desde su segunda inspección. Los manifiestos de las hojas y `data/catalog/audit.json` permiten contrastar sus hashes. La validación y auditoría finales se ejecutaron después de los cambios. Siguen pendientes la aprobación humana, el enriquecimiento de las fichas mínimas y las prioridades editoriales del informe; no se ha aprobado ni publicado ninguna ficha.

Es una revisión de assets y datos locales. No se implementó una interfaz, no se ejecutó el navegador de Ary y no se atribuye a esta entrega una validación visual de escritorio/móvil de la aplicación.
