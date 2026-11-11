# Ary — Etapa 10B: catálogo integrado

Fecha: 2026-11-11. Trabajo local en `D:\Ary The Parrot`.

Implementadas la importación de las 317 fichas, su búsqueda léxica en memoria, hechos para respuestas y contexto, medios y moderación de visibilidad. La base probada fue exclusivamente PGlite en memoria. `lint`, `typecheck` y las 298 pruebas unitarias pasan. La aceptación visual y los E2E quedan pendientes: Next dev y Playwright no pueden iniciar sus subprocesos (`spawn EPERM`). El build compila, pero su comprobación TypeScript interna encuentra el mismo bloqueo. No se declara esta interfaz visualmente verificada.

## Archivos

Nuevos:

- `data/catalog/validate.d.mts`: contrato TypeScript del validador compartido.
- `drizzle/0006_stage10b_catalog.sql`.
- `drizzle/rollback/0006_stage10b_catalog.sql`.
- `drizzle/meta/0006_snapshot.json`.
- `src/db/catalog-import.ts`: importación validada, transaccional e idempotente y tabla explícita de fusiones.
- `src/server/ai/catalog-search.ts`: interfaz `CatalogSearch`, índice por idioma, caché TTL e invalidación.
- `src/server/catalog-admin.ts`: búsqueda del personal, ocultación bilingüe y auditoría.
- `src/components/catalog-manager.tsx`: lista, filtros, detalles y acciones de visibilidad.
- `scripts/catalog-check.ts`: comprobación reproducible, local y sin carga de credenciales.
- `tests/unit/stage10b.test.ts`: 14 pruebas de integración y búsqueda.
- `tests/e2e/stage10b.spec.ts`: siete casos, incluidos dos recorridos de capturas.
- `docs/evidence/stage10b/visual-review.md`.
- `docs/screenshots/stage10b/README.md`.
- `docs/ARY_STAGE10B_REPORT.md`.

Modificados:

- `data/catalog/validate.mjs`: exporta la validación existente; importarla no ejecuta el CLI ni escribe su informe. Devuelve también las dimensiones ya verificadas de las imágenes.
- `drizzle/meta/_journal.json`: registra 0006.
- `src/db/schema.ts`: aliases, facts, gallery, sources, origin y hiddenAt.
- `src/db/seed.ts`: separa alias de tags.
- `scripts/database.ts`, `package.json`: comando `db:catalog`.
- `scripts/e2e-server.ts`: importa el JSON local después del seed, sin red.
- `src/server/ai/retrieval.ts`: reutilización de tokens y reconocimiento de aliases/facts.
- `src/server/ai/chat.ts`: búsqueda nueva en lugar del límite de 100, galerías y exclusión de fichas ocultas.
- `src/server/ai/providers.ts`: contexto con resumen y hasta cuatro hechos; respaldo con un hecho relevante; instrucción sobre datos concretos.
- `src/server/item-media.ts`: assets de catálogo, galerías, fotos ilustrativas y variantes válidas de licencias Commons.
- `src/server/service.ts`: oculta fichas en las consultas públicas y guardadas; las recomendaciones consideran hasta 1000 filas del idioma, suficiente para el catálogo completo.
- `src/server/stage4b-http.ts`: rutas autorizadas de catálogo y validación de filtros/acciones.
- `src/server/staff-page.tsx`, `src/components/staff-shared.tsx`, `src/components/admin-workspace.tsx`: sección «Catálogo».
- `src/components/source-carousel.tsx`, `src/components/item-photo.tsx`, `app/stage9.css`: galería y navegación del visor con teclado, créditos y adaptación móvil.
- `playwright.config.ts`: proyecto stage10b.
- `tests/e2e/helpers.ts`, `tests/e2e/stage6.spec.ts`, `tests/e2e/stage9.spec.ts`, `tests/e2e/stage9d.spec.ts`: fixtures que paginan el catálogo para encontrar las fichas conocidas.
- `tests/unit/database.test.ts`: snapshot y rollback de 0006.
- `tests/unit/stage9c.test.ts`: comprueba los alias en su nueva columna.

La ruta real de migraciones es `drizzle/`, no `src/db/migrations/`. Se respetó el migrador existente. `next-env.d.ts` fue regenerado incidentalmente por el build y se devolvió a su contenido inicial. El documento de instrucciones `docs/codex/STAGE10B_CATALOG_IN_ARY.md` ya estaba sin seguimiento y no se modificó.

## Tabla de fusiones

Revisión manual de identidad contra las claves originales del seed. No se usa similitud automática. Cada entidad conserva sus dos IDs de fila existentes, uno por idioma.

| catalogKey | contentKey conservado |
| --- | --- |
| merengue | merengue |
| bachata | bachata |
| mangu | mangu |
| carnaval | carnaval |
| haitises | haitises |
| ballenas | ballenas |
| larimar | larimar |
| ambar | ambar |
| altos-chavon | altos-chavon |
| ciudad-colonial | ciudad-colonial |
| cocolo | cocolo |
| congos | congos |

Las fusiones conservan título, resumen, descripción, editor y fuente principal del seed cuando esta está comprobada. Añaden hechos, fuentes, galería, alias, tipo, provincia y ubicación del catálogo. Si la fuente del seed no está comprobada se toma el contenido y la fuente comprobada del catálogo. `kind` pasa a `type`; `province`, a `region`; la ubicación se adapta con `mapsQuery` sin cambiar `PlaceLocation`. La primera foto rellena `image` e `imageAsset`.

## Importación en PGlite

Comando independiente: `node scripts/catalog-check.ts`. No carga `.env`, usa `connectDatabase({ memory: true })`, aplica migraciones y prepara comprobaciones históricas sintéticas para las doce fichas del seed. Los `checkedAt`/HTTP 200 del catálogo se leen del JSON, sin comprobar fuentes en vivo.

| Ejecución | Insertadas | Actualizadas | Fusionadas | Omitidas | Motivo |
| --- | ---: | ---: | ---: | ---: | --- |
| Primera | 610 | 0 | 24 | 0 | 305 entidades nuevas y 12 entidades fusionadas, en ES/EN |
| Segunda | 0 | 0 | 0 | 634 | unchanged |

Los recuentos son filas por idioma: quedan **317 entidades y 634 filas**. La segunda importación conserva contenido e IDs y no ejecuta upserts para filas sin cambios. La comparación canónica evita considerar distintos los objetos cuyo orden de propiedades cambia al almacenarse en JSONB.

La validación completa del mismo `validate.mjs`, incluidos los WebP locales, termina antes de abrir la transacción de escritura. Un catálogo inválido no escribe nada. No hay borrados ni despublicación por ausencia del catálogo. Una fila seed ajena a la tabla de fusiones queda protegida. `hidden_at` nunca forma parte del update del importador. En modo producción, las filas importadas tienen `demo=false`. La restricción `published_has_source` permanece intacta.

## Búsqueda y respuestas

Índice por idioma sobre todas las filas publicadas, no ocultas, con fuente HTTPS comprobada y sin instrucciones inyectadas en textos, alias o hechos. Caché del módulo por conexión/idioma durante cinco minutos; el panel invalida la caché al ocultar o mostrar. La caché es local al proceso; no se introduce un servicio distribuido.

Se normalizan acentos, mayúsculas y puntuación. Frases completas de título/alias tienen prioridad máxima; los tokens del título y alias pesan 12, resumen/hechos 5 y tags/tipo/provincia 3. La tolerancia de edición uno se aplica a nombres y alias para tokens de cinco letras o más, evitando que un parecido incidental en el resumen produzca una cita. Se incorporan los seis grupos de sinónimos solicitados, filtros de categoría, provincia y destino nombrado. Las listas penalizan repetir provincia y palabras de títulos ya seleccionados.

Ejemplos comprobados: `bayaibe` recupera Bayahíbe; `samna`, Samaná; `salto el limon`, Salto El Limón; `bahia de las aguilas`, Bahía de las Águilas; `whale watching`, ballenas; `colonial zone`, Ciudad Colonial. Las preguntas de comida, playas, fiestas y museos/provincia se restringen a sus categorías pertinentes. Tokio devuelve cero fichas. «Qué hacer en Samaná» ofrece Samaná, ballenas y otras fichas de esa provincia. «Fiestas dominicanas» en ES ofrece carnaval, Festival del Merengue, Espíritu Santo de Cotuí y fiestas patronales.

El contexto incluye título, resumen, descripción de hasta 600 caracteres y hasta cuatro hechos por ficha, con cuatro fichas en texto y ocho en voz. Los hechos mantienen su fuente. El respaldo selecciona un hecho relevante y conserva los límites de longitud. No se usan embeddings ni pgvector ni llamadas remotas para buscar. Los cambios del proveedor se probaron mediante mocks; no se contactó a Gemini.

El visor conserva Esc, foco atrapado, restauración de foco y alt; añade flechas y botones anterior/siguiente cuando hay varias fotos. Las búsquedas de fotos por categoría presentan una foto por ficha; una entidad específica proporciona su galería, hasta seis fotos. Los mapas siguen el formato de la etapa 9 y las restricciones existentes del kiosco. Las fotos ilustrativas de comida muestran la etiqueta ES/EN y sus créditos/licencia.

## Tiempos medidos

Última ejecución de `node scripts/catalog-check.ts`, sobre la versión final del buscador. Por cada consulta e idioma: cinco calentamientos y cincuenta búsquedas completas con el índice construido, medidas con `performance.now()`. Milisegundos, redondeados a tres decimales; incluyen ordenación y diversidad, excluyen importación/construcción inicial del índice. Son medidas locales, no latencia de producción ni del modelo.

| Consulta | ES mediana | ES p95 | EN mediana | EN p95 |
| --- | ---: | ---: | ---: | ---: |
| bayaibe | 0.466 | 1.304 | 0.655 | 0.821 |
| salto el limon | 0.606 | 0.814 | 0.736 | 1.099 |
| bahia de las aguilas | 0.724 | 0.835 | 0.736 | 0.871 |
| samna | 0.476 | 0.759 | 0.402 | 0.583 |
| whale watching | 0.642 | 0.899 | 0.435 | 0.712 |
| colonial zone | 0.253 | 0.565 | 0.247 | 0.463 |
| qué comer | 0.151 | 0.192 | 0.069 | 0.116 |
| playas en Punta Cana | 0.157 | 0.206 | 0.077 | 0.192 |
| qué hacer en Samaná | 0.580 | 0.922 | 0.444 | 0.616 |
| fiestas dominicanas | 0.172 | 0.212 | 0.085 | 0.149 |
| museos de Santiago | 0.054 | 0.074 | 0.028 | 0.035 |
| ¿qué hora es en Tokio? | 0.295 | 0.570 | 0.306 | 0.495 |

Máximo individual entre estas 1200 mediciones: **2.829 ms**. Vitest también verifica p95 menor que 20 ms sobre cien búsquedas calientes y 317 filas del idioma.

## Panel de personal

`/admin/catalogo` y `/api/admin/catalog` usan los permisos de operadores/superadministradores y el mismo control de sesión/CSRF del resto del panel. Analistas, proveedores y visitantes no reciben el permiso de moderación. La función de escritura vuelve a comprobar el rol.

La lista agrupa las traducciones por `contentKey`, muestra títulos ES/EN, foto, resumen, tipo, provincia, origen, visibilidad, hechos y fuentes con enlace. Búsqueda con la misma implementación `CatalogSearch`; admite también filas ocultas para el personal. Filtros por tipo, provincia, origen y visibilidad. Ocultar/Mostrar actúa sobre ambas traducciones en una transacción y registra `catalog.hide`/`catalog.show` en el log existente. No hay edición de textos en esta sección. El shell del personal permanece en español como el panel existente; los registros muestran los dos títulos.

Los filtros se apilan en móvil, las filas pasan de foto/detalle a una columna y los controles incluyen carga, vacío, error con reintento, acción en curso y mensaje de resultado. Esto está implementado y revisado en código, pendiente de inspección real en navegador.

## Comandos y resultados

| Comando | Resultado observado |
| --- | --- |
| `npm run lint` | PASS, sin warnings |
| `npm run typecheck` | PASS |
| `npm run test` | PASS final: 22 archivos, 298 pruebas, 16.83 s |
| `npm run test -- tests/unit/stage10b.test.ts tests/unit/stage9c.test.ts tests/unit/stage9.test.tsx` | PASS después del ajuste final de puntuación: 97 pruebas, 11.08 s |
| `node scripts/catalog-check.ts` | PASS: importaciones 610/24 y 634 unchanged; búsquedas y medidas de la tabla |
| `npm run build` | Compilación Turbopack correcta (2.6 s); falla el paso TypeScript por `spawn EPERM` |
| `npm run test:e2e -- --project=stage10b` | Bloqueado antes de ejecutar casos: `Error: spawn EPERM` |
| `node scripts/e2e-server.ts` | Prepara PGlite aislado; Next dev falla en `next-dev.js` al hacer fork: `spawn EPERM` |
| `git -c core.whitespace=cr-at-eol diff --check` | PASS; se reconocen los CRLF conservados |
| `git diff --exit-code -- data/catalog/candidates.json public/assets/catalog src/server/email/templates.ts` | PASS: datos, fotos protegidas y plantilla de correo intactos |

El `git diff --check` sin configurar `cr-at-eol` señala los CR de los archivos que ya usan CRLF como whitespace; no se cambiaron sus finales para silenciarlo. `git ls-files --eol` confirma CRLF en los archivos correspondientes, incluido `chat.ts`; los archivos LF conservan LF.

Las pruebas cubren idempotencia, las doce fusiones/IDs/textos, protección de seed externo, catálogo inválido sin escrituras, hidden_at tras reimportar, fuentes y medios de las 634 filas, erratas, aliases ingleses, categorías/provincia, diversidad, pregunta ajena, rendimiento y límites/hechos del contexto. También comprueban moderación con auditoría y rechazo del rol analista, historial, ficha pública y listas sin el contenido oculto.

## Bloqueos y discrepancias de datos

1. **E2E y dos pasadas visuales pendientes.** No se pudieron iniciar Next dev ni Playwright por `spawn EPERM`. No se generaron ni inspeccionaron capturas. Los dos recorridos de captura implementados no se cuentan como revisión visual realizada. Detalle: [registro visual](evidence/stage10b/visual-review.md).
2. **El catálogo no contiene galerías múltiples.** Las 317 fichas tienen exactamente una foto cada una. Salto El Limón y Bahía de las Águilas también tienen una. Se muestran todas las disponibles, sin inventar imágenes ni editar los datos protegidos. El caso E2E de El Limón verifica la única foto real. Otro caso usa una segunda imagen explícitamente sintética para probar flechas; repite el asset con un alt sintético y no acredita una segunda foto cultural.
3. **Build completo pendiente.** El typecheck directo pasa; el subproceso del build está bloqueado. No se afirma build final exitoso.
4. **Voz real y proveedores externos no probados.** El E2E de voz reutiliza una respuesta del servicio determinista y simula la transcripción/transporte; está bloqueado igual que los demás E2E. No acredita reconocimiento de voz ni latencia remota.

Se respetaron las restricciones: sin commits, push, despliegues, correos externos, acceso a base de producción, Gemini real, embeddings ni modificaciones de `candidates.json`/assets. No se usó `outputs/` ni memoria de otros proyectos; no se imprimieron secretos. Las verificaciones no autorizan ni realizan publicación de la aplicación.
