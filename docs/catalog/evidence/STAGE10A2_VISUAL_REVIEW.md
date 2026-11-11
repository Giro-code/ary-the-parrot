# Revisión fotográfica final de la etapa 10A2

Fecha: 2026-11-11. Alcance: assets locales del catálogo, sin implementar ni ejecutar la interfaz de Ary. No aplica una comprobación de escritorio/móvil o interacción de la aplicación a este trabajo de datos.

## Primera pasada real

Se generaron, abrieron y miraron las 16 hojas `10a2-final-pass1/sheet-01.jpg` a `sheet-16.jpg`: 317 selecciones. El manifiesto de esa carpeta identifica cada clave, archivo y SHA-256. Se revisaron correspondencia del tema, encuadre, fotografías frente a mapas o reproducciones, imágenes de especies, retratos históricos y el uso de imágenes contextuales.

Hallazgos corregidos:

- `Playa San Rafael.jpg` muestra Punta del Este, Uruguay, según sus metadatos. Se excluyó y se sustituyó por contexto dominicano expresamente identificado, sin atribuir la fotografía a San Rafael.
- El museo Gregorio Luperón usaba un retrato histórico como imagen de lugar. Se sustituyó por contexto urbano de Puerto Plata, identificado como tal.
- Se sustituyeron las imágenes satelitales de Oviedo y de la experiencia de aves por flamencos fotografiados en esa laguna.
- Se retiraron las imágenes satelitales de Oviedo reutilizadas para Los Patos y Gri-Gri. Los reemplazos describen el lugar contextual real y aclaran que no muestran el destino exacto.
- Se sustituyó la postal coloreada de Montecristi en tres fichas por una fotografía del paisaje costero del parque nacional.
- Se sustituyó la fotografía de pelícanos de localización no acreditada del parque submarino La Caleta por una playa que Commons identifica expresamente como parte del parque dominicano.

Las 11 acciones, las fuentes anteriores y nuevas y sus motivos se guardan en `data/catalog/evidence/stage10a2-photo-corrections.json`.

## Segunda pasada real tras regenerar

Se regeneraron desde los archivos corregidos, abrieron y miraron las 16 hojas `10a2-final-pass2/sheet-01.jpg` a `sheet-16.jpg`, nuevamente con las 317 selecciones. Se verificaron los cambios especialmente en las hojas 1, 4, 6, 11, 14, 15 y 16. Los flamencos sustituyen la imagen satelital de Oviedo, no queda la playa uruguaya, el museo de Luperón no usa el retrato y la postal coloreada fue reemplazada. No se modificaron imágenes después de esta pasada.

## Límites y prioridades editoriales

La revisión confirma los archivos y las correcciones descritas, no una fotografía exacta de todas las entidades. Se conservan imágenes contextuales claramente identificadas en `alt` y `reviewNotes`, e ingredientes ilustrativos para algunas comidas. Entre los casos prioritarios para mejorar la fotografía están San Rafael, Los Patos, Gri-Gri, Minitas, El Valle, Cofresí, Bergantín, Playa Esmeralda, la Casa de la Cultura y varios talleres y actividades. Las imágenes de contexto no documentan que una actividad o ceremonia esté sucediendo en ellas.

Los retratos históricos se limitan a fichas biográficas. Las cotorras de La Española aparecen identificadas como ejemplares en cautiverio. La correspondencia taxonómica fina, los derechos de personalidad y la aprobación editorial de publicación requieren revisión humana; el catálogo conserva `status: draft`.

La validación de datos y el inventario final acompañan esta revisión. Los manifiestos permiten comprobar que el contenido inspeccionado coincide con las imágenes que referencia el catálogo final.
