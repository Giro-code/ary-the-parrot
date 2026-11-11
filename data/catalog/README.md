# Catálogo 10A: datos de investigación

`candidates.json` es el catálogo final de borradores completos. No está importado en la aplicación ni aprobado para publicación. `validate.mjs` funciona únicamente con módulos nativos de Node.

```text
node data/catalog/validate.mjs
node data/catalog/audit.mjs
```

La validación comprueba estructura, textos, licencias permitidas, imágenes, coordenadas, cobertura de las 32 demarcaciones y las doce claves originales. La auditoría contrasta respuestas de fuentes, atribuciones y huellas de las imágenes. La inspección visual se documenta en `docs/catalog/evidence/visual-review.md`.

`batches.json` registra los guardados incrementales. `rejected.json` contiene exclusiones e incidencias sin resolver; `evidence/recovered-incidents.json` separa las incidencias que se recuperaron. `preserved-seed.json` conserva las doce fichas iniciales sin ejecutar el seed ni acceder a la base de datos.

Los demás scripts, planes y descubrimientos son herramientas y registros de trabajo, no otros catálogos para importar. Los candidatos de trabajo se reconciliaron con el conjunto final. Ningún archivo de `src/`, `app/`, tests, paquetes, migraciones o base de datos fue escrito por esta tarea.

Las respuestas archivadas conservan fechas, HTTP, identificadores, metadatos y hashes. Se quitaron los párrafos de los artículos, HTML completo y descripciones largas de terceros. Las páginas de Commons se identifican por su revisión y sus plantillas de licencia. Para una nueva investigación hay que volver a consultar el contenido; los hashes no sustituyen la lectura de una fuente. Los registros de 403 no autorizan intentar sortear un bloqueo.

Una ficha sin QID usa `wikidata: null`: corresponde al Carnaval de La Vega, respaldado por el Ayuntamiento. No se inventó un identificador para la fiesta regional. Los lugares amplios pueden tener un punto representativo; no se certifica su entrada ni condiciones de visita.

Los créditos y las transformaciones de las fotos se enumeran en `docs/catalog/IMAGE_CREDITS_CATALOG.md`. Las licencias CC BY-SA se mantienen en sus derivados. Las fotografías contextuales de monumentos o localidades se identifican como tales; no sustituyen una fotografía documental de una ceremonia.
