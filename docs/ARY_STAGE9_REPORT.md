# Etapa 9 · fotos y ubicaciones verificadas

Trabajo local del 10 de noviembre de 2026 en `D:\Ary The Parrot`. Implementación, migración y pruebas unitarias preparadas. El cierre de build/E2E y de las dos pasadas visuales queda bloqueado por el entorno.

## Resultado

- Diez fotografías Commons con atribución y alt ES/EN en el seed. Veinte WebP locales con tamaño principal de hasta 1200 px y variante de hasta 480 px. Se reutilizan las tres fotografías existentes de `public/assets/places/`, conservando esos originales. Cocolo y Congos quedan sin foto por la selección editorial documentada.
- Migración `0005_stage9_places_media` añade `cultural_items.image` jsonb. Reutiliza `image_asset` para la ruta local y `location` para los puntos verificados. El JSON de imagen guarda autor, código/URL de licencia, página de Commons, alt bilingüe y dimensiones. El seed actualiza las filas existentes de ambas lenguas mediante su clave única, preservando sus IDs y evitando duplicados.
- Seis ubicaciones verificadas en Wikipedia. Se guardan coordenadas redondeadas a cuatro decimales y su nombre. `mapsUrl` construye el enlace de búsqueda de Google exclusivamente desde lat/lng numéricas finitas y dentro de rango.
- La respuesta del chat incorpora `image`, nombre y `mapsUrl` mediante las fichas publicadas y comprobadas que aparecen en `citedItemIds`. La IA recibe únicamente ID, título y descripción. Sus URLs y coordenadas textuales provocan descarte y fallback. Al releer conversaciones se reconstruyen las fuentes desde el catálogo vigente, incluidas conversaciones anteriores a esta etapa y las trasladadas por QR.
- Tarjetas con foto superior, crédito visible, ampliación mediante diálogo modal nativo y carrusel horizontal con scroll-snap, teclado e indicadores. La primera tarjeta del último mensaje carga eager y las restantes lazy, con sizes. Ary utiliza mostrar cuando presenta fotos, conservando los estados de escucha, pensamiento, error y celebración.
- El chip de ubicación formula la pregunta sobre la ficha elegida. Las preguntas breves de ubicación recuperan la cita anterior. Los destinos desconocidos conservan el flujo previo de guardado como texto. El servidor genera la respuesta de direcciones y su cue hablado, con el nombre del lugar en pantalla y acceso a Maps. La voz habla del acceso en pantalla.
- Mi cultura incorpora miniatura y Maps mediante la tarjeta compartida. La ficha pública incorpora foto grande, atribución y Maps. Los enlaces de Maps usan pestaña nueva y `noopener noreferrer`. Las tarjetas y diálogos del kiosco muestran atribución en texto y suprimen enlaces externos, conservando el QR para continuar en el teléfono.

## Fotografías y ubicaciones

La tabla completa por ficha, autor, licencia, URL y transformaciones está en [IMAGE_CREDITS](IMAGE_CREDITS.md). Los metadatos de todos los assets, dimensiones, tamaños y SHA-256 están en [assets.json](evidence/stage9/assets.json). La hoja de contacto revisada está en [photos-contact-sheet.png](evidence/stage9/photos-contact-sheet.png).

| Ficha | Autor | Licencia |
| --- | --- | --- |
| Ciudad Colonial | Ulises Jorge | CC BY 2.0 |
| Merengue | Rafa Esteve | CC BY-SA 4.0 |
| Bachata | Mobilus In Mobili | CC BY-SA 2.0 |
| Mangú | Ll1324 | CC0 1.0 |
| Larimar | Vassil | Dominio público, PD-self |
| Ámbar | Géry PARENT | CC BY-SA 3.0 |
| Los Haitises | Rachel Docherty | CC BY 2.0 |
| Ballenas de Samaná | Danu Widjajanto | CC BY-SA 4.0 |
| Carnaval de La Vega | Estefanía Moronta | CC BY-SA 4.0 |
| Altos de Chavón | Captain-tucker | CC BY-SA 3.0 |
| Teatro Cocolo Danzante | Sin foto | El candidato localizado tenía resolución y contexto documental limitados |
| Congos de Villa Mella | Sin foto | La búsqueda no dio una foto específica con licencia/contexto verificables |

| Ficha / lugar vinculado | lat | lng |
| --- | --- | --- |
| Ciudad Colonial de Santo Domingo | 18.4833 | -69.9167 |
| Parque Nacional Los Haitises | 19.0067 | -69.6419 |
| Ballenas / Bahía de Samaná | 19.1667 | -69.4167 |
| Altos de Chavón | 18.4203 | -68.8897 |
| Congos / Villa Mella | 18.5500 | -69.9000 |
| Carnaval / La Vega | 19.2200 | -70.5300 |

Las fuentes, coordenadas de origen y criterios de asociación están en [PLACE_LOCATIONS](PLACE_LOCATIONS.md). Merengue, Bachata, Mangú, Cocolo, Larimar y Ámbar conservan ubicación null. La elección de Villa Mella y La Vega utiliza los lugares mencionados en sus fichas. Los puntos del parque, bahía y Ciudad Colonial representan áreas amplias.

## Comandos y resultados

| Comando o comprobación | Resultado |
| --- | --- |
| `node scripts/generate-stage9-migration.ts` | PASS, una sentencia ALTER TABLE, snapshot y journal generados |
| `node scripts/stage9-images.mjs` | PASS, 20 WebP desde Commons y assets existentes |
| `npm run lint` | PASS, cero advertencias |
| `npm run typecheck` | PASS, tsc sin emisión |
| `npm test -- --maxWorkers=2` | PASS, 229 pruebas en 19 archivos |
| `npm run build` | EXIT 1, Turbopack compila y el paso Running TypeScript termina con `spawn EPERM` |
| `npm run check:kiosk-budget` | PASS, 39 750 bytes gzip de 204 800 permitidos, sobre chunks compilados |
| CSS de etapa 9 | 3461 bytes, 1154 gzip. El proyecto define presupuesto para JS |
| `npx playwright test --list --project=stage9` | PASS, seis casos descubiertos |
| `npx playwright test --project=stage9 --workers=1` | EXIT 1, `Error: spawn EPERM` antes de ejecutar casos |
| `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3019` | EXIT 1, `spawn EPERM`, `ChildProcess.spawn` / `fork` en `next-dev.js` |
| Navegador integrado | `The browser access host is unavailable` |
| `git -c core.whitespace=cr-at-eol diff --check` | PASS. Se conservan los CRLF de los archivos que ya los utilizaban |

El presupuesto se conserva como evidencia de esta etapa en [kiosk-budget.json](evidence/stage9/kiosk-budget.json). La compilación de chunks permite medir JS aunque el build completo siga fallando. El runtime disponible es Node 26.2.0 y el proyecto prescribe Node 24.x.

Las unitarias nuevas cubren coordenadas ausentes, no numéricas, infinitas y fuera de rango, seed repetido y actualización de filas antiguas, dimensiones y variantes reales, media exclusivamente de fichas citadas publicadas, dos citas, rechazo de URLs/coordenadas del modelo, tema inmaterial sin Maps, preguntas de ubicación con contexto, destino desconocido, retirada de una ficha, compatibilidad de historial y markup bilingüe sin enlaces externos en kiosco. Migración, snapshot y rollback se ejecutaron únicamente en PGlite en memoria. Las fuentes del seed usadas en pruebas son fixtures, con un conjunto explícitamente sintético para probar las doce fichas.

Se actualizó una aserción antigua de la prueba de recibos de etapa 4B al título vigente `Solicitud enviada`, tras observar que esperaba `Solicitud enviada a un proveedor`. Se conservaron sus comprobaciones de destinatario, consentimiento, cifrado, dry-run e idempotencia. También se actualizaron los selectores de guardado E2E al texto de etapa 9.

## Verificación visual y bloqueos

Se inspeccionaron las diez fotografías en visor y se corrigió el alt de Mangú. La revisión visual de la interfaz y las capturas a 390/1440 px siguen pendientes por los errores descritos. [Registro de revisión](evidence/stage9/visual-review.md) y [capturas pendientes](screenshots/stage9/README.md).

Los seis casos de Playwright incluyen web con foto/crédito/chip/Maps, Mi cultura y ficha pública, carrusel móvil sin overflow, foco y Esc en diálogo, kiosco activado con QR y dos recorridos de captura separados. La respuesta cultural se simula en el transporte usando media del catálogo local. La procedencia desde el proveedor y el servidor se cubre en Vitest con fetch simulado. Falta ejecutar esos casos en navegador y revisar sus capturas antes de declarar verificada la interfaz.

La migración y el seed en Neon quedan para el revisor. Todos los cambios de esta ejecución permanecen locales. Se respetaron las restricciones sobre commits, push, despliegues, correo y llamadas reales a Gemini. Las consultas externas se limitaron a las fuentes públicas de fotos y coordenadas. Se ignoraron `outputs/` y las memorias de otros proyectos. Las escrituras de texto usan UTF-8. La CSP y la restricción `geolocation=()` se conservan.

## Archivos

- `app/api/[...path]/route.ts`, `app/cultura/[id]/page.tsx`, `app/layout.tsx`, `app/stage9.css`
- `src/location.ts`, `src/db/schema.ts`, `src/db/seed.ts`, `src/db/seed-media.ts`
- `src/server/item-media.ts`, `src/server/ai/chat.ts`, `src/server/ai/providers.ts`, `src/server/ai/safety.ts`, `src/server/places.ts`
- `src/components/ary-chat.tsx`, `src/components/ary-stage.tsx`, `src/components/icons.tsx`, `src/components/item-photo.tsx`, `src/components/maps-link.tsx`, `src/components/source-carousel.tsx`, `src/components/shared.tsx`, `src/components/types.ts`, `src/components/trip.tsx`, `src/components/public-culture.tsx`
- `drizzle/0005_stage9_places_media.sql`, `drizzle/meta/0005_snapshot.json`, `drizzle/meta/_journal.json`, `drizzle/rollback/0005_stage9_places_media.sql`
- `scripts/generate-stage9-migration.ts`, `scripts/stage9-images.mjs`, `playwright.config.ts`
- `tests/unit/stage9.test.tsx`, `tests/unit/database.test.ts`, `tests/unit/stage4b.test.ts`
- `tests/e2e/stage9.spec.ts`, selectores actualizados en `stage2.spec.ts`, `stage3.spec.ts`, `stage6.spec.ts`, `stage8.spec.ts`
- `public/assets/items/` con pares `<key>.webp` y `<key>-480.webp` para `ciudad-colonial`, `merengue`, `bachata`, `mangu`, `larimar`, `ambar`, `haitises`, `ballenas`, `carnaval`, `altos-chavon`
- `docs/IMAGE_CREDITS.md`, `docs/PLACE_LOCATIONS.md`, `docs/ARY_STAGE9_REPORT.md`, `docs/screenshots/stage9/README.md`
- `docs/evidence/stage9/assets.json`, `kiosk-budget.json`, `css-size.json`, `photos-contact-sheet.png`, `visual-review.md`

## Verificación del revisor (2026-11-11), etapas 9 y 9B

- `lint`, `typecheck`, 234 pruebas unitarias y `build`: **PASS**.
- Playwright: **79/79 pasan**.
- Capturas revisadas: tarjetas con foto y atribución, carrusel a 390 px, ubicación con «Abrir en Google Maps», «Mi cultura» y la bienvenida del correo a 1920 px.
- Migración `0005` aplicada en Neon de producción. Seed idempotente ejecutado: 10/12 fuentes verificadas, igual que en la etapa 2.
  - UNESCO devuelve 403 a los bots.
  - `museosrd.gob.do` no responde.
- **Correcciones del revisor:**
  - `.voice-header` usaba `margin: auto` dentro de un contenedor flex en columna. Eso centraba la cabecera en vertical en la bienvenida de escritorio. Ahora usa `margin: 0 auto`.
  - `AccountArt` pedía `ary-sin-conexion.webp`, que aún no existe (404). Ahora usa `pensar` hasta que llegue la ilustración.
  - Aserción de alerta filtrada en `stage9b`.
