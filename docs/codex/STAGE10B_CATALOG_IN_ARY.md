# Codex — Etapa 10B: el catálogo de 317 fichas pasa a Ary

Sigues en `D:\Ary The Parrot`. Etapas 1–9D desplegadas en https://arytheparrot.app. La etapa 10A dejó `data/catalog/candidates.json` (317 fichas validadas, ES/EN, con `aliases`, `facts`, `sources`, `images`, `location` y `province`) y las fotos en `public/assets/catalog/`.

Hoy Ary solo conoce las 12 fichas de `src/db/seed.ts`. El objetivo es que **use las 317**, rápido y con fotos y mapas.

Lee primero:

- `docs/catalog/CATALOG_10A_REPORT.md`
- `data/catalog/validate.mjs` y una ficha de ejemplo de `candidates.json`
- `src/db/schema.ts`, `src/db/seed.ts`, `src/db/seed-media.ts`, `scripts/database.ts`
- `src/db/migrations/` (la última es `0005_stage9_places_media.sql`)
- `src/server/ai/chat.ts`, `retrieval.ts`, `providers.ts`, `safety.ts`
- `src/components/source-carousel.tsx` y la lógica de medios de la etapa 9 (`itemMedia`)
- la sección de personal en `app/admin/[[...section]]`
- `tests/e2e/` (helpers de seed con PGlite) y `docs/ARY_STAGE9C_REPORT.md`

## Decisiones ya tomadas por el revisor

- **Sin embeddings ni pgvector en esta etapa.** El propietario prioriza la velocidad: no añadas otra llamada de red por pregunta. Con unas 300 fichas por idioma, basta un **índice léxico en memoria** bien hecho (punto 3). Deja una interfaz `CatalogSearch` para poder cambiar a vectores más adelante.
- **Las fichas del catálogo se publican** al importarlas si pasan el validador y tienen fuente comprobada (`checkedAt` + `httpStatus` 200). El personal puede **ocultarlas** desde el panel (punto 5).
- **No se duplican** las 12 fichas existentes (merengue, bachata, mangú, carnaval, Haitises, ballenas, larimar, ámbar, Altos de Chavón, Ciudad Colonial, cocolo, congos). Si una ficha del catálogo es la misma entidad, se **fusiona** en la fila existente:
  - se conserva su `contentKey` y su `id`, porque `saved_experiences` y `recommendations` apuntan a él;
  - se le añaden los `facts`, la galería, los alias, la ubicación y las fuentes del catálogo;
  - se mantiene el texto y la fuente revisados del seed, salvo que la del seed no esté verificada.
  - Haz el emparejamiento con una tabla explícita (`catalogKey → contentKey`) revisada a mano. No lo hagas por similitud automática.

## 1. Esquema (migración `0006_stage10b_catalog.sql`)

Añade a `cultural_items`, con valores por defecto para que las filas existentes sigan siendo válidas:

- `aliases jsonb not null default '[]'`: alias de búsqueda del idioma de la fila. Mueve los `searchAliases` del seed aquí y deja de mezclarlos en `tags`;
- `facts jsonb not null default '[]'`: `[{ text, sourceUrl }]` en el idioma de la fila;
- `gallery jsonb not null default '[]'`: `ImageMetadata[]` con la ruta local (`file`, `thumb`), autor, licencia, URL de Commons y `alt` en ES y EN;
- `sources jsonb not null default '[]'`: `[{ url, editor, checkedAt }]`. `sourceUrl` sigue siendo la fuente principal;
- `origin text not null default 'seed'`: `'seed' | 'catalog'`;
- `hidden_at timestamptz`: si tiene valor, la ficha no se muestra ni se recupera.

Mapea `kind` → `type` y `province` → `region`. Mapea `location` al formato `PlaceLocation` que usan los mapas de la etapa 9. Si el formato no encaja, adapta en el importador, no cambies `PlaceLocation`. La primera imagen de `gallery` rellena `image` e `imageAsset`, para que todo lo existente (carrusel, tarjetas, «Mi cultura») funcione sin cambios.

Mantén la restricción `published_has_source`. Escribe también el `rollback` como en las migraciones anteriores.

## 2. Importador idempotente

`src/db/catalog-import.ts` + script `npm run db:catalog` (vía `scripts/database.ts catalog`):

- lee `data/catalog/candidates.json` y ejecuta antes la misma validación que `validate.mjs` (reutiliza o importa su lógica). Si falla, **no escribe nada**;
- hace un upsert por `(contentKey, language)` con `contentKey = key` (o el `contentKey` fusionado). Es idempotente: ejecutarlo dos veces no cambia nada;
- **no** vuelve a comprobar las fuentes en vivo: usa el `checkedAt`/`httpStatus` registrado en el catálogo;
- no toca ni borra filas `origin = 'seed'`, salvo para la fusión descrita, y no despublica nada que no venga en el catálogo;
- respeta `hidden_at`: un reimport no vuelve a mostrar lo que el personal ocultó;
- en producción `demo = false`, igual que el seed;
- imprime un resumen: insertadas, actualizadas, fusionadas, omitidas y su motivo.

El seed de E2E con PGlite también importa el catálogo, desde el JSON y sin red, para que las pruebas usen las 317 fichas.

## 3. Búsqueda rápida (`src/server/ai/catalog-search.ts`)

Hoy `retrieve` carga como mucho 100 filas publicadas y las puntúa con `lexicalScore`. Con 634 filas eso deja fuera la mayoría.

- Al primer uso, construye un índice en memoria por idioma con las filas publicadas y no ocultas. Cachéalo en el módulo con un TTL de 5 minutos e invalídalo cuando el panel oculte o muestre una ficha.
- Normaliza sin acentos y en minúsculas, reutilizando `normalize`. Sinónimos ES/EN: «playa/beach», «cascada/salto/waterfall», «comida/plato/food», «fiesta/festival/carnaval», «museo/museum», «iglesia/catedral/church».
- **Puntuación:**
  - coincidencia de frase completa de título o alias: puntuación máxima;
  - palabras del título y de los alias pesan más que las de `summary` y `facts`, y estas más que `tags`, `type` y `region`;
  - **tolerancia a erratas**: tokens de 5 o más letras a distancia de edición 1 («bayaibe» → «Bayahibe», «samna» → «Samaná»);
  - **intención por categoría**: «qué comer», «playas en Punta Cana», «fiestas en febrero», «museos de Santiago». Si la pregunta nombra un tipo o una provincia, filtra o prioriza por `type` o `region`.
- Devuelve las N mejores con su puntuación. Mantén el umbral de 9C, con el que una pregunta general sin coincidencias no cita nada.
- Preguntas de lista («dame 5 playas», «qué hacer en Samaná») devuelven varias fichas variadas, no 5 casi iguales.
- **Rendimiento:** con el índice ya construido, una búsqueda tarda menos de 20 ms para 317 fichas. Escribe una prueba Vitest que lo mida de forma holgada.
- Sustituye en `chat.ts` todas las lecturas `limit(100)` o «cargar todo y puntuar» por esta búsqueda. `lexicalScore` puede quedarse como función interna.

## 4. Ary usa los hechos y las galerías

- **Contexto del modelo** (`providers.ts`): por cada ficha relevante, envía `title`, `summary`, la descripción (máximo 600 caracteres, como ahora) y **hasta 4 `facts`**. Mantén los límites de 9C: 4 fichas en texto y 8 en voz. Indica al modelo que solo use esos hechos para datos concretos (fechas, alturas, años de la UNESCO).
- **Respuesta sin IA** (`DemoAiProvider` / respaldo): con «Te cuento sobre {title}: {summary}», añade el hecho más relevante para la pregunta, si lo hay.
- **Galería:**
  - «muéstrame fotos de Bahía de las Águilas» muestra **todas las fotos de esa ficha** (hasta 6), cada una con su crédito y licencia, en el carrusel de la etapa 9 o en una variante de galería;
  - «fotos de playas» muestra una foto por ficha, de varias fichas;
  - tocar una foto la amplía (lightbox accesible: Esc, flechas, foco atrapado, `alt`) y muestra el crédito.
- **Mapas:** las fichas con `location` muestran el botón de Google Maps como en la etapa 9.
- **Créditos:** las fotos de comida marcadas como ilustrativas en `reviewNotes` muestran «Foto ilustrativa» / «Illustrative photo».

## 5. Panel de personal: «Catálogo»

Nueva sección en `/admin`, con el mismo control de acceso que las demás:

- lista con búsqueda (usa la misma `CatalogSearch`) y filtro por tipo, provincia, origen y visible u oculta;
- por ficha:
  - título ES/EN, foto, resumen, número de hechos y fuentes con enlace;
  - **Ocultar / Mostrar**, que pone o quita `hidden_at` e invalida el índice;
- el registro de la acción, si ya existe un log de auditoría para el personal, siguiendo el patrón actual;
- sin edición de texto en esta etapa.

## 6. Pruebas

**Vitest:**

- el importador es idempotente;
- el importador fusiona las 12 fichas sin duplicar y respeta `hidden_at`;
- un catálogo inválido no escribe nada;
- la búsqueda resuelve:
  - erratas: «bayaibe», «salto el limon», «bahia de las aguilas», «samna»;
  - alias en inglés: «whale watching», «colonial zone»;
  - intención de tipo: «qué comer» → comida; «playas» → playas;
  - provincia: «qué hacer en Samaná»;
- una pregunta sin relación («¿qué hora es en Tokio?») no cita nada;
- la búsqueda tarda menos de 20 ms;
- el contexto del modelo incluye hechos y respeta los límites.

**Playwright** (`tests/e2e/stage10b.spec.ts`, en Modo Chat con `switchToChat`, y un caso en Modo Voz):

- «Háblame de Bahía de las Águilas» → tarjeta con foto, crédito y Maps;
- «muéstrame fotos del Salto El Limón» → galería con varias fotos, lightbox con teclado;
- «¿qué puedo comer?» → varias fichas de comida;
- «fiestas dominicanas» → fichas de tradiciones;
- en voz, «cuéntame del merengue» → subtítulos con un hecho y la tarjeta;
- en el panel, ocultar una ficha hace que deje de aparecer en el chat, y mostrarla la devuelve;
- capturas en `docs/screenshots/stage10b/` a 390 y 1440 px, ES/EN: tarjeta, galería, lightbox y panel.

Actualiza las pruebas existentes que dependan de que solo haya 12 fichas, por ejemplo las de recuento o las fichas destacadas.

**Comprobaciones:** `lint`, `typecheck` y `test` deben pasar. `build` y Playwright pueden fallar con `spawn EPERM` en tu sandbox; si pasa, documéntalo y el revisor los ejecutará.

## Restricciones

- Sin commits, push, despliegues ni correos.
- Sin llamadas reales a Gemini ni a la base de datos de producción.
- No imprimas secretos.
- **No modifiques** el contenido de `data/catalog/candidates.json` ni de `public/assets/catalog/`. Si encuentras un error de datos, anótalo en el informe.
- Ignora `outputs/` y las memorias de otros proyectos.
- No traduzcas código.
- Escribe **siempre en UTF-8** con `apply_patch`, y conserva los finales de línea de cada archivo (`src/server/email/templates.ts` usa CRLF).

## Entrega

Escribe `docs/ARY_STAGE10B_REPORT.md` e imprime:

- archivos;
- la tabla de fusiones;
- el resumen del importador sobre PGlite;
- los tiempos de búsqueda medidos;
- comandos y resultados;
- bloqueos.
