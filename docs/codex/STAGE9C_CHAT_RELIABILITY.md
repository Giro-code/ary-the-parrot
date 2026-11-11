# Codex — Etapa 9C: Ary responde bien, rápido y muestra imágenes

Sigues en `D:\Ary The Parrot`. La etapa 9 (fotos y Google Maps) está desplegada en https://arytheparrot.app.

Lee primero:

- `src/server/ai/providers.ts`
- `src/server/ai/chat.ts`
- `src/server/ai/safety.ts`
- `src/server/places.ts`
- `src/server/item-media.ts`
- `src/db/seed.ts`
- `src/conversation.ts`
- `src/components/ary-chat.tsx`
- `docs/ARY_STAGE9_REPORT.md`

## Problemas que vio el propietario en producción (11-11-2026)

1. **Casi siempre responde «Ahora mismo no puedo pensar bien, ¿lo intentamos otra vez?»** y tarda mucho.
   - A veces sale una ficha debajo, pero el texto y el audio dicen esa frase de error. Por ejemplo, «háblame sobre cuevas en RD» mostró la ficha de Congos de Villa Mella con ese texto.
   - Causa probable: `GeminiProvider.generate` lanza `AiError` por validaciones muy estrictas (`invalid_citation`, `ungrounded_output` con `confidence < 0.6`, `specific_general_output` por cualquier dígito, `provider_incomplete_output` o el tiempo límite de 12 s). Entonces `DemoAiProvider` devuelve la frase de error **y cita `items[0]`**, una ficha que puede no tener relación.
2. **«Háblame sobre la zona colonial»** devolvió una respuesta general vaga («te sugiero consultar fuentes oficiales»), sin la ficha «Ciudad Colonial de Santo Domingo» ni su foto. La búsqueda léxica no reconoce sinónimos como zona colonial, colonial zone, cuevas o whales.
3. **«Muéstrame imágenes»** → «No puedo mostrar imágenes directamente…». Falso: la app sí muestra las fotos verificadas de las fichas. **Si el visitante pide imágenes, Ary debe mostrarlas.**

## Qué hacer

### 1. Nunca decir «no puedo pensar bien» si hay una ficha relevante

Cambia el respaldo cuando la IA falla o es rechazada:

- **Si hay fichas relevantes** (con coincidencia léxica real en `retrieve`), responde con una **respuesta fundamentada sin IA**:
  - texto breve y cálido creado desde la ficha: título más `summary` de la ficha principal, por ejemplo «Te cuento sobre Parque Nacional Los Haitises: …»;
  - cita **solo** esas fichas, como mucho 3;
  - `intent: "culture"`.
  - Así se muestran tarjeta, foto y Maps, y la voz dice ese mismo texto.
- **Si no hay fichas relevantes**, da un texto amable y no técnico que invite a elegir un tema (música, comida, historia, naturaleza) con `followUps`, **sin citar ninguna ficha**. Nunca cites `items[0]` por defecto.
- La frase «no puedo pensar bien» solo queda para un fallo real sin nada que mostrar, por ejemplo la voz sin transcripción.

### 2. Validaciones: rescatar en lugar de tirar

En `GeminiProvider.generate`:

- `citedItemIds` con IDs que no están en el contexto → **filtra** esos IDs en lugar de lanzar `invalid_citation`.
- Intención `culture` con citas válidas pero `confidence < 0.6` → acéptala si cita fichas del contexto; la confianza baja solo no basta para rechazar.
- Intención `culture` sin citas → usa la cita por título existente o, si `retrieve` encontró fichas, pasa al respaldo fundamentado del punto 1.
- `specific_general_output`: no rechaces por cualquier dígito. Mantén el bloqueo de precios, monedas, horas `\d{1,2}:\d{2}`, distancias, coordenadas y URLs, pero permite años como «2016» o «siglo XVI».
- Las reglas de seguridad no se relajan: URLs, HTML, coordenadas inventadas y temas sensibles siguen bloqueados.
- Registra siempre el `errorCode` en `ai_usage`, como ahora.

### 3. Velocidad

- Reduce el contexto enviado:
  - `validatedDescription` hasta 600 caracteres;
  - como mucho 4 fichas en texto y 8 en voz;
  - historial de 4 turnos de 300 caracteres.
- Acorta el `system` sin perder reglas.
- `thinkingConfig`: usa el nivel mínimo que acepte el modelo. Si el modelo no admite `thinkingLevel: "minimal"`, haz que sea configurable con `AI_THINKING_LEVEL`, con valor por defecto `low`.
- `maxOutputTokens` 500.
- Tiempo límite configurable `AI_TIMEOUT_MS`: por defecto 9000 en texto y 12000 en voz. Al vencer, se usa el respaldo del punto 1, que es instantáneo.
- **Modelo.** Sigue configurable con `AI_MODEL`. Documenta en el informe cómo medir la latencia por modelo con `ai_usage.latencyMs`.
- **Script de diagnóstico** `scripts/ai-usage-report.ts`, de solo lectura:
  - imprime las últimas N filas de `ai_usage`: fecha, modelo, modo, `errorCode`, `latencyMs` y tokens;
  - y un resumen: porcentaje de errores por código y latencia media y p90 por modelo;
  - sin imprimir nunca la URL de la base de datos ni secretos.
  - Añade `npm run ai:report`.

### 4. Sinónimos y búsqueda

- Añade a cada ficha del seed un campo de **alias de búsqueda** (ES/EN), sin mostrarlo al usuario. Puede ir en `tags` o en un campo nuevo; si hace falta migración, que sea `0006`. Ejemplos:
  - **ciudad-colonial:** zona colonial, colonial zone, santo domingo colonial, casco historico, catedral primada.
  - **haitises:** cuevas, caves, manglares, mangroves, petroglifos.
  - **ballenas:** ballenas, whales, samana, avistamiento.
  - **mangu:** comida, desayuno, food, platano.
  - **merengue y bachata:** musica, baile, music, dance.
  - **larimar y ambar:** piedras, joyas, gems, jewelry, souvenir.
  - **carnaval:** diablos cojuelos, mascaras, carnival.
  - **altos-chavon:** la romana, anfiteatro.
  - **cocolo:** san pedro de macoris.
  - **congos:** villa mella.
- En `retrieve`:
  - compara con plurales y singulares básicos (cueva ↔ cuevas, whale ↔ whales);
  - ignora palabras vacías como «hablame», «muestrame», «imagenes», «fotos», «republica», «dominicana» o «rd»;
  - una mención de la ficha por alias pasa la intención a `culture` con cita, no a `general`.
- Prueba: «háblame sobre la zona colonial» → cita Ciudad Colonial con foto. «Háblame de cuevas en RD» → cita Los Haitises y **no** Congos.

### 5. «Muéstrame imágenes / fotos»

Nueva intención `images` en `classifyIntent`. Frases como:

- muéstrame, enséñame, ver, quiero ver + imágenes, fotos o fotografías;
- show me, see + pictures, photos, images;
- y variantes con faltas comunes, por ejemplo «iamgenes» o «imagenes».

Comportamiento, sin IA:

1. Si el mensaje nombra un tema o lugar (por alias o búsqueda léxica), muestra esas fichas **con foto**.
2. Si no nombra nada, usa las fichas citadas en el último turno del historial que tengan foto.
3. Si no hay contexto, muestra 3 fichas destacadas con foto (Ciudad Colonial, Los Haitises, Altos de Chavón).

Respuesta:

- texto breve, por ejemplo «¡Mira! Aquí tienes fotos de Ciudad Colonial de Santo Domingo» / «Here are some photos of…»;
- `intent: "culture"`, con las fichas citadas;
- la voz dice «Te dejé las fotos en pantalla» / «I've put the photos on screen»;
- el carrusel de la etapa 9 se usa tal cual.

Además, en el `system` de Gemini indica que **la app muestra automáticamente las fotos y mapas verificados de las fichas citadas**. Ary nunca debe decir que no puede mostrar imágenes: si piden fotos de algo con ficha, debe citarla.

En el kiosco, igual: fotos sí, Maps no.

### 6. Respuestas generales sobre lugares con ficha

Si una pregunta «general» coincide con una ficha por alias (zona colonial, Samaná, La Romana…), trátala como `culture` y cita la ficha. Las respuestas generales sin ficha deben ser cálidas y útiles. Evita repetir «consulta fuentes oficiales» salvo que se pidan datos precisos.

## Pruebas

**Vitest**, con el proveedor simulado y `fetch` simulado para Gemini:

- falla de Gemini (timeout, `invalid_output`, HTTP 500) con fichas relevantes → respuesta fundamentada con el título de la ficha, sin «no puedo pensar bien», y cita solo fichas relevantes;
- falla sin fichas → sin citas;
- `citedItemIds` con un ID desconocido → se filtra, no falla;
- una respuesta general con «2016» se acepta; con «$20» o «10:30» se rechaza;
- alias:
  - zona colonial → Ciudad Colonial;
  - cuevas → Haitises;
  - whales → ballenas;
- «muéstrame imágenes»:
  - después de hablar de Los Haitises → cita Los Haitises con imagen;
  - sin contexto → 3 fichas con foto;
  - «show me photos of Samaná» → ballenas;
- `npm run ai:report` con una base PGlite en memoria imprime el resumen y no contiene `postgres://`.

**Playwright** (proveedor simulado):

- «háblame sobre la zona colonial» → tarjeta con foto de Ciudad Colonial;
- «muéstrame imágenes» → carrusel con fotos;
- simula un fallo de la IA y verifica que no aparece «no puedo pensar bien» cuando hay ficha.

Actualiza las pruebas existentes que dependan del texto de `DemoAiProvider`.

**Comprobaciones:** `lint`, `typecheck` y `test` deben pasar. `build` y Playwright pueden fallar con `spawn EPERM` en tu sandbox; si pasa, documéntalo y el revisor los ejecutará.

## Restricciones

- Sin commits, push, despliegues ni correos.
- Sin llamadas reales a Gemini ni conexiones a la base de producción.
- No imprimas secretos.
- Ignora `outputs/` y las memorias de otros proyectos.
- No traduzcas código.
- Escribe los archivos **siempre en UTF-8** con `apply_patch`. Nada de tuberías PowerShell→python.

## Entrega

Al terminar, escribe `docs/ARY_STAGE9C_REPORT.md` e imprime:

- archivos;
- migración, si la hubo;
- alias añadidos;
- variables nuevas (`AI_TIMEOUT_MS`, `AI_THINKING_LEVEL`);
- comandos y resultados;
- bloqueos.
