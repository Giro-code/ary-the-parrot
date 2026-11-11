# Codex — Etapa 9: fotos de los destinos y ubicación en Google Maps dentro del chat

Sigues en `D:\Ary The Parrot`. Las etapas 1–8 están desplegadas en https://arytheparrot.app.

Lee primero:

- `README.md`
- `docs/ARY_STAGE8_REPORT.md`
- `docs/IMAGE_CREDITS.md`
- `src/db/schema.ts` (`cultural_items`: `imageAsset`, `location`)
- `src/db/seed.ts`
- `src/location.ts`
- `src/server/ai/chat.ts`
- `src/components/ary-chat.tsx`, `trip.tsx` y `public-culture.tsx`

En esta versión de Next, `middleware` se llama `proxy`. Consulta `node_modules/next/dist/docs/` antes de tocar `next/image` o la configuración.

## Qué pide el propietario

1. Cuando Ary habla de un destino o tema, la respuesta **muestra la foto del lugar relacionado**.
2. Ary puede **ofrecer la ubicación** («¿Quieres la ubicación?») y dar el enlace al lugar en **Google Maps**.

## Principio no negociable

La foto y la ubicación salen **solo de la ficha publicada y verificada** que Ary cita (`citedItemIds`). **Nunca** de la IA:

- la IA no elige URLs de imágenes;
- la IA no genera imágenes de lugares reales;
- la IA no inventa coordenadas ni enlaces de mapas.

Si la ficha no tiene foto o ubicación, no se muestra nada: ni sustitutos ni texto falso.

## 1. Datos: foto y ubicación para cada ficha publicada

**Fotos.** Para cada una de las 12 fichas del seed (Ciudad Colonial, Merengue, Bachata, Teatro Cocolo Danzante, Congos de Villa Mella, Mangú, Larimar, Ámbar, Los Haitises, Ballenas de Samaná, Carnaval de La Vega, Altos de Chavón), busca una foto en **Wikimedia Commons** con licencia compatible: dominio público, CC0, CC BY o CC BY-SA. Comprueba la licencia en la página del archivo.

Criterios:

- **Lugares** (Ciudad Colonial, Los Haitises, Samaná, Altos de Chavón): una foto del lugar.
- **Temas inmateriales o gastronomía** (merengue, bachata, mangú, carnaval, Cocolo, Congos): una foto representativa y respetuosa, sin personas identificables en primer plano salvo que la foto sea de un evento público y su licencia lo permita. Si no hay una buena, deja la ficha **sin foto** y documéntalo. Mejor sin foto que una dudosa.
- **Materiales** (larimar, ámbar): foto del material.
- Sin marcas de agua ni fuentes dudosas.

Formato y almacenamiento:

- WebP en `public/assets/items/<contentKey>.webp` a unos 1200 px como máximo, más una variante `-480.webp` para las tarjetas.
- Reutiliza `catedral.webp`, `haitises.webp` y `chavon.webp` de `public/assets/places/` si encajan.

**Esquema.** `imageAsset` ya existe. Añade con una migración `0005` los campos `image_credit` (autor), `image_license` (código y URL) e `image_source_url` (página de Commons), o un `jsonb` `image` con esos campos. La atribución se muestra siempre.

**Ubicación.** Para cada ficha que sea un **lugar** concreto, guarda en `location` (`jsonb`):

```text
{ label, lat, lng, mapsQuery }
```

- Coordenadas comprobadas en la página de Wikipedia o Wikidata del lugar (cita la fuente en `docs/PLACE_LOCATIONS.md`) y redondeadas a 4 decimales.
- Los temas inmateriales (merengue, bachata, mangú…) **no** llevan ubicación.
- Si un tema tiene un lugar ligado claro (Carnaval de La Vega → La Vega; Congos de Villa Mella → Villa Mella; Cocolo → San Pedro de Macorís; Ballenas → Bahía de Samaná), puede llevarlo **solo** si la ficha lo menciona.

**Seed y producción.** Actualiza `src/db/seed.ts` (idempotente) para que fotos y ubicaciones lleguen a Neon. El revisor ejecutará la migración y el seed en producción.

## 2. Enlace a Google Maps construido por el servidor

- En `src/location.ts`, crea `mapsUrl(location)`, que construye **solo** desde lat y lng validadas: `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`. Si no hay coordenadas válidas, devuelve `null`.
  - Sin API key, sin embeds ni iframes de Google.
  - Actualiza el comentario de cabecera: ahora sí se construye un enlace, pero solo desde datos verificados de la ficha.
- El enlace se abre en una pestaña nueva con `rel="noopener noreferrer"`. No toques la CSP, porque es un enlace normal.
- No pidas la ubicación del visitante. Nada de geolocalización: `geolocation=()` sigue bloqueado.

## 3. En el chat

**Foto en la tarjeta.** En las tarjetas de ficha de la respuesta, pon la foto arriba con `next/image`, en proporción 16:9 o 4:3, con `alt` descriptivo en ES/EN y la atribución pequeña bajo la foto («Autor · Wikimedia Commons · CC BY-SA 3.0», enlazada a la página del archivo).

**Varias fichas citadas.** Si la respuesta cita 2 o 3, se muestran como un **carrusel horizontal** con `scroll-snap`, accesible con teclado y con indicadores. Nada se corta ni provoca scroll horizontal de la página.

**Foto ampliada.** Al tocar la foto se abre en grande, en un diálogo accesible: `Esc`, foco atrapado y botón cerrar.

**Ofrecer la ubicación.** Si la ficha citada tiene ubicación, Ary añade un chip de seguimiento: «📍 ¿Quieres la ubicación?» / «Want the location?».

- Al pulsarlo, o si el visitante pregunta «¿dónde queda?», «ubicación», «cómo llego» o «mapa» (la intención `directions` ya existe), Ary responde con el **nombre del lugar** y un botón **«Abrir en Google Maps»**, con icono SVG de pin.
- Ary **no** da indicaciones de ruta en texto.
- **En la web**, el botón abre Maps. Además siguen «Guardar en Mi cultura» y «Abrir ficha».
- **En el kiosco** no se abren enlaces externos, porque es una pantalla pública. Se mantiene el comportamiento de la etapa 8: el QR para continuar en el teléfono. Una vez en el teléfono, la ficha muestra el botón de Maps.

**Voz.** La respuesta hablada no lee la URL. Dice algo como «Te dejé la ubicación en pantalla».

**Imagen de Ary.** Cuando se muestra un lugar con foto, Ary usa `ary-mostrar`.

## 4. «Mi cultura», ficha pública `/cultura/[id]` y kiosco

- «Mi cultura» muestra la foto en miniatura de cada guardado y el botón «Abrir en Google Maps» si hay ubicación.
- `/cultura/[id]` muestra la foto grande, la atribución y el botón de Maps.
- **Kiosco:** fotos sí, en el tamaño de la tarjeta; enlace de Maps no (va por QR).

## 5. Rendimiento y seguridad

- `loading="lazy"` excepto la primera tarjeta visible y `sizes` correctos.
- Sin dominios externos de imágenes: todo se sirve desde `/assets`.
- Revisa el presupuesto del kiosco (`check:kiosk-budget`), que solo mide JS. Si el CSS o el JS crecen, que sigan dentro.
- Ningún dato de la IA llega a `src`, `href` o `alt` sin pasar por la ficha.
- Prueba unitaria: si el modelo devuelve una URL o coordenadas en su texto, se ignoran. Solo cuentan las de la ficha.

## 6. Pruebas

**Vitest:**

- `mapsUrl` con coordenadas válidas, inválidas, fuera de rango y ausentes;
- la respuesta del chat incluye `image` y `mapsUrl` solo de fichas citadas;
- tema inmaterial → sin `mapsUrl`;
- el kiosco no expone `mapsUrl` en la UI;
- seed idempotente con imágenes y ubicaciones.

**Playwright:**

- web: «¿Qué ver en Samaná?» (proveedor simulado) → tarjeta con foto y atribución → chip «¿Quieres la ubicación?» → botón Maps con `href` `https://www.google.com/maps/search/?api=1&query=…` y `target=_blank`;
- carrusel con 2 fichas a 390 px, sin scroll horizontal;
- diálogo de foto con `Esc`;
- kiosco: foto sí y botón Maps no;
- «Mi cultura» con miniatura y Maps.

**Capturas** en `docs/screenshots/stage9/` a 390 y 1440 px. Revísalas tú.

**Comprobaciones:** `lint`, `typecheck`, `test` y `build` deben pasar, o documenta el error exacto del sandbox.

**Documentación:**

- `docs/IMAGE_CREDITS.md`: tabla completa de cada foto nueva;
- `docs/PLACE_LOCATIONS.md`: coordenadas y fuente;
- `docs/ARY_STAGE9_REPORT.md`.

## Restricciones

- Sin commits, push, despliegues ni correos.
- Sin llamadas reales a Gemini.
- No imprimas secretos.
- Ignora `outputs/` y las memorias de otros proyectos.
- No traduzcas código.
- Escribe los archivos **siempre en UTF-8**: usa `apply_patch` o escrituras UTF-8 explícitas. Nada de tuberías PowerShell→python, que en la etapa 8B convirtieron «ó ¡ ¿ …» en «?».

## Entrega

Al terminar, imprime:

- archivos;
- migración;
- tabla de fotos (ficha, autor, licencia) y fichas sin foto con su motivo;
- ubicaciones;
- comandos y resultados;
- bloqueos.
