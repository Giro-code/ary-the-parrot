# Codex — Etapa 9B: E2E de la etapa 9, pantalla de correo en PC y «Mis viajes» → cultura

Estás en `D:\Ary The Parrot`. La etapa 9 (fotos y Maps) está en el árbol **sin commitear**: no la reviertas.

El revisor, fuera del sandbox, comprobó que `lint`, `typecheck`, 229 pruebas unitarias y `build` pasan. En Playwright pasan **68** y fallan **7**. El registro está en `docs/codex/e2e-stage9-failures.log`; bórralo al terminar.

## 1. Arregla los 7 E2E

Fallan estos tests:

- `stage9:69`: el diálogo de la foto.
- `stage9:86` (×2): las pasadas visuales.
- `stage4a:11`: el kiosco con citas.
- `stage4a:25`: el historial en el móvil.
- `stage6:117` (×2): las pasadas visuales.

Lee los errores en el registro y en `test-results/*/error-context.md`.

- Si la causa es un **fallo real** del producto, corrige el producto. Lo más probable es que las tarjetas nuevas o el carrusel hayan cambiado la estructura o los nombres accesibles que esperan las pruebas antiguas.
- Si no, ajusta la prueba, sin perder lo que valida.

El revisor ejecutará Playwright de nuevo.

## 2. Pantalla de correo inicial (`/experiencia`, `email-welcome.tsx`) rota en escritorio

Captura del propietario a 1920 px:

- Ary y el sobre ocupan el centro-izquierda con mucho espacio vacío.
- Todo el formulario queda **aplastado en una columna de unos 190 px** a la derecha, con **scroll interno**: los chips de pasos parten en dos líneas y el botón «Start talking to Ary» ocupa dos líneas.

La causa probable es un contenedor de la app de chat (altura fija u `overflow`, de la etapa 8) que envuelve la bienvenida, o un grid de `.account-journey` heredado con anchos incorrectos.

Corrígelo:

- En escritorio, dos columnas equilibradas centradas, con un máximo de unos 980 px:
  - Ary con su burbuja y el sobre: unos 320 px.
  - Contenido: el resto, al menos 420 px.
- **Sin scroll interno**: la página hace scroll normal.
- Los chips de pasos, en una fila.
- Botón de una sola línea.
- En móvil, una columna.

Comprueba también `/reingresar` y las pantallas de cuenta, que comparten estilos. Captura a 390, 768, 1280 y 1920 px y revisa tú las imágenes.

## 3. «Mis viajes» / «My trips» → cultura

El propietario dice:

> «More than trip, says culture, remember that's culture, and we want to change that part of the experience».

Lo que el visitante guarda son descubrimientos culturales: lugares, música, comida, historias.

- **Nuevo nombre:** «Mi cultura» (ES) / «My culture» (EN).
- **Icono SVG nuevo:** algo cultural en lugar de la maleta, por ejemplo una hoja de palma o un sello o marco con una forma caribeña. Hecho a mano, coherente con `icons.tsx`.
- **Textos de la página:**
  - título «Tu colección cultural» / «Your cultural collection»;
  - subtítulo breve, por ejemplo «Lo que descubriste con Ary: lugares, sabores, ritmos e historias»;
  - estado vacío amable con Ary.
- **Botones:** «Guardar en Mis viajes» pasa a «Guardar en Mi cultura» / «Save to My culture».
- **Dónde aplicarlo:** en la UI (cabecera, chat, carrusel, ficha pública), en `src/i18n*`, en los textos de Ary del servidor (`src/server/ai/chat.ts`), en los correos (`src/server/email/templates.ts`, solo los textos), en `/privacidad` y `/terminos` y en la documentación.
- **Ruta.** Crea `/mi-cultura` como ruta principal y deja `/mi-viaje` redirigiendo a ella (308), para no romper enlaces antiguos ni correos ya enviados.
- **Nombres internos.** No renombres tablas, columnas ni rutas de la API (`saved`, `trip-places`…). Solo los textos visibles y la ruta de página.
- **Pruebas.** Actualiza unitarias y E2E. Busca y elimina cualquier «Mis viajes», «Mi viaje», «My trips» o «My trip» visible que quede.

## Comprobaciones

- `lint`, `typecheck` y `test`.
- Archivos siempre en **UTF-8**: usa `apply_patch`; nada de tuberías PowerShell→python.
- No traduzcas código.

## Restricciones

- Sin commits, push, despliegues ni correos.
- Sin llamadas a Gemini.
- Ignora `outputs/` y las memorias de otros proyectos.

## Entrega

Al terminar, imprime los archivos, las causas reales encontradas y los resultados.
