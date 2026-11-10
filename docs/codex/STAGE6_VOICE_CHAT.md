# Codex — Etapa 6: Ary como chat conversacional por voz

Sigues en `D:\Ary The Parrot`. Las etapas 1–5 están hechas, verificadas y **desplegadas en producción** en https://arytheparrot.app (Vercel + Neon). Lee primero:

- `README.md`
- `docs/ARY_AI.md`
- `docs/FEATURE_MATRIX.md`
- `src/components/kiosk.tsx`, `experience.tsx`, `ary-chat.tsx` y `use-robot.ts`
- `src/server/ai/*`
- `app/globals.css`

Antes de tocar la configuración de Next, lee la guía relevante en `node_modules/next/dist/docs/`.

## Qué pide el propietario (sus palabras, resumidas)

- La experiencia actual de `/kiosco` y `/experiencia` parece un formulario, con preguntas muy obvias y poco *family friendly*.
- Debe sentirse como **una app de chat donde Ary está hablando contigo todo el tiempo**.
- Es **por voz**: el texto no tiene que dominar.
- Ary tiene **voz de mujer agradable** con **manerismos de cotorra**.
- Hay cinco ilustraciones de Ary, una para cada momento de la conversación.

El propietario autoriza expresamente:

- micrófono y voz;
- llamadas a Gemini para transcripción, respuesta y TTS.

Esto sustituye la nota anterior de que la voz requería autorización posterior.

## Ilustraciones (ya en `public/assets/ary/`, webp transparentes)

| Archivo | Estado de Ary |
| --- | --- |
| `ary-presentar.webp` | Saluda con un ala: bienvenida y presentación, también cuando detecta presencia. |
| `ary-pensar.webp` | Ala en el pico, mirando arriba: escuchando el final de tu pregunta o preparando la respuesta. |
| `ary-mostrar.webp` | Señala con el ala: «esto está en tal lugar»; presenta una ficha, lugar o recomendación. |
| `ary-celebrar.webp` | Alas abiertas y ojos cerrados de alegría: encontraste algo, guardaste un lugar, conseguiste el QR. |
| `ary-sin-conexion.webp` | Tirado en el suelo, agotado: sin internet o servicio caído. **El propietario lo añadirá**. Mientras falte, usa `ary-pensar.webp` en escala de grises con opacidad, sin romper nada. Que el código no falle si el archivo no existe. |

**Reglas de uso:**

- Una sola ilustración grande visible por estado, en `next/image` con `sizes` correcto y `priority` solo en la inicial.
- Transición suave entre estados: crossfade de unos 200 ms.
- `prefers-reduced-motion` desactiva las animaciones.
- **Hablando.** Una animación sutil del personaje mientras suena el audio: leve balanceo vertical y escala de 1 a 1,02, o un «pulso» de anillo detrás. Nunca un parpadeo rápido.
- No toques `public/assets/ary-la-cotorra.png` ni otros assets existentes de la landing.

**Mapa de estados.** Reutiliza `RobotState` y `ChatActivity` en lugar de inventar otros. El mismo estado alimenta la imagen y el robot físico (`use-robot.ts`).

| Estado | Imagen |
| --- | --- |
| `idle`, `welcome`, `presence` | presentar |
| `listening` (micrófono abierto) | pensar, con un indicador de escucha claro |
| `thinking` | pensar |
| `talking` + respuesta con fichas o lugares | mostrar |
| `talking` sin fichas | presentar |
| Ficha guardada, QR emitido o canje confirmado | celebrar, 2–3 s, y vuelve |
| `offline` / `error` | sin-conexion |

## 1. Nueva interfaz: chat con Ary

Rediseña **solo** `/kiosco` y `/experiencia`. La landing (`public/index.html`, `brochure.html`, `landing.css` y `landing.js`) no se toca: debe seguir con 0 píxeles de diferencia.

**Layout tipo app de mensajería**, en pantalla completa del kiosco 1280×800 / 1920×1080 y en móvil 360–430 px:

- **Arriba:** Ary grande, el «escenario».
- **Debajo:** la conversación en burbujas.
  - Las de Ary, a la izquierda con un mini avatar.
  - Las del visitante, a la derecha.
  - Auto-scroll a lo último.
  - Mensajes de Ary con texto **corto**, porque el contenido principal va hablado.
- **Abajo:** barra de entrada.
  - **Botón de micrófono grande y central**, de al menos 72 px en el kiosco. Mantener o tocar para hablar; tocar otra vez para terminar.
  - Teclado como opción secundaria (icono).
  - Botón de silenciar o activar la voz de Ary.

**Fichas.** Las fichas o recomendaciones aparecen **dentro del chat** como tarjetas compactas, con título, una línea, fuente y las acciones «Guardar» y «Abrir». No hay una página separada de resultados.

**Sin formularios.** Se elimina el flujo actual de pasos (idioma → país → intereses → resultados). Ary conduce la conversación:

1. **Saludo hablado.** Por ejemplo: «¡Hola, hola! Soy Ary, la cotorra de República Dominicana. ¿Me hablas en español o en inglés?». Ofrece chips rápidos: «Español», «English».
2. **Pregunta natural por intereses.** «¿Qué te gustaría descubrir? Música, comida, playas, historia…», con chips de respuesta rápida en lugar de checkboxes. El país es **opcional**: Ary puede preguntar «¿De dónde nos visitas?» solo si encaja, y aceptar «prefiero no decirlo».
3. **Respuestas.** Ary responde mezclando la explicación hablada con tarjetas.
4. **Continuar en el móvil.** Cuando hay algo guardado o la conversación avanza, Ary ofrece «¿Quieres llevarte esto en tu teléfono?». Muestra el QR **dentro del chat** con el código de confirmación de 2 dígitos. El QR mantiene toda su seguridad actual.
5. **Despedida.** «Terminar» limpia la sesión como ahora.

**Contrato del servidor.** Los datos que hoy captura el formulario (locale, país opcional, intereses) se siguen guardando con los **mismos endpoints** (`/api/visitor/preferences`, etc.), ahora alimentados desde la conversación. No cambies el contrato de QR, guardados ni privacidad.

**Kiosco.** Se conservan:

- inactividad de 90 s, aviso «¿Sigues ahí?» y reinicio;
- «Terminar sin continuar»;
- estados de conexión;
- presencia por el puente local.

El texto del aviso puede hablarse.

**Accesibilidad:**

- Todo usable sin voz y solo con teclado.
- `aria-live="polite"` para los mensajes nuevos de Ary.
- Contraste AA.
- Subtítulos: el texto de lo que Ary dice está siempre disponible en la burbuja.
- El botón del micrófono anuncia su estado.

**Tono family friendly:** frases cortas y cálidas, sin jerga y sin preguntas obvias del tipo «Seleccione sus intereses».

## 2. Voz de Ary (TTS)

**Proveedor.** Gemini TTS con la misma `GEMINI_API_KEY`, solo en el servidor. Modelos disponibles hoy en la cuenta: `gemini-3.8-flash-lite-tts`, `gemini-3.8-flash-tts` y `gemini-2.5-flash-preview-tts`.

- Predeterminado: `AI_TTS_MODEL=gemini-3.8-flash-lite-tts`, configurable.
- Consulta la documentación oficial actual de la API de TTS (endpoint, `responseModalities: ["AUDIO"]`, `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` y formato PCM 24 kHz que hay que envolver en WAV) y la **lista oficial de voces**.

**Voz.** Elige una voz **femenina, cálida y agradable**, por ejemplo una de tono amable o brillante de la lista oficial.

- Configurable con `AI_TTS_VOICE`.
- Documenta cuál elegiste y por qué.
- El propietario dará más adelante el modelo o voz definitivos, así que todo debe cambiarse solo con variables de entorno.

**Manerismos de cotorra:**

- Usa la instrucción de estilo del TTS: alegre, expresiva, ritmo vivo, acento caribeño dominicano suave en español, cercana.
- Haz que el texto generado para voz incluya **ocasionalmente** interjecciones de cotorra:
  - un «¡rrrr!» o trino breve al saludar o celebrar;
  - repetir una palabra clave con gracia, al estilo «¡Merengue, merengue!»;
  - un «¡Hola, hola!».
- Como máximo **una** por respuesta y nunca en temas sensibles (redirecciones de seguridad, aeropuerto o vuelos, privacidad).
- Que el chiste no tape la información.
- **Separación de campos.** El texto que se muestra en la burbuja puede omitir la onomatopeya. Separa `displayText` y `spokenText` en el esquema Zod de respuesta.

**Ruta `POST /api/voice/speak`:**

- Recibe `{ messageId }` de una respuesta ya generada y validada por el servidor. **Nunca** texto libre del cliente, para que no sea un TTS abierto.
- Devuelve `audio/wav`.
- Protecciones: rate limit por sesión y global, CSRF como el resto, `maxDuration` adecuado y timeout.
- Cachea por hash de (texto, voz, modelo) en memoria o en Blob/DB solo si es barato. Los saludos fijos pueden precalcularse.
- Si el TTS falla o va lento, Ary sigue en texto y lo muestra con honestidad («Ahora no puedo hablar, te lo escribo»).

**Reproducción en el cliente:**

- Un único `<audio>`. Interrumpible: si el visitante pulsa el micrófono, Ary se calla.
- Respeta el botón de silenciar.
- En el kiosco el audio está activo por defecto tras la primera interacción, por la política de autoplay. En móvil empieza activo tras el primer toque.
- El estado «talking» de la imagen y del robot dura lo que dura el audio real (`onplay`/`onended`), no un temporizador.

**Latencia.** Mide y documenta el tiempo de pregunta → audio. Si hace falta, genera la respuesta y empieza el TTS de la primera frase antes; documenta la decisión.

## 3. Escucha (voz → texto)

Chromium en Raspberry Pi **no** tiene Web Speech API fiable, así que no dependas de `webkitSpeechRecognition`. Como mucho úsalo como mejora opcional en navegadores que lo soporten de verdad.

**Camino principal:**

1. **Grabación.** `MediaRecorder` en webm/opus.
   - Pulsar para hablar, máximo 15 s, con indicador de nivel o onda simple y botón de parar.
   - Solo graba tras una acción explícita del visitante; nunca graba al detectar presencia.
2. **Envío.** `POST /api/voice/ask` con el audio, en multipart o binario y con límite de tamaño (≈ 1 MB).
   - **Una sola llamada** a Gemini (`AI_MODEL`, que acepta audio) que transcribe y responde en JSON validado por Zod: `{ transcript, displayText, spokenText, itemIds, intent, ... }`.
   - Reutiliza **todo** el pipeline de `src/server/ai/` (contexto publicado, temas sensibles, defensa ante inyección, límites, `ai_usage`) en vez de duplicarlo.
   - La transcripción se muestra como burbuja del visitante.
3. **Privacidad:**
   - El audio **no se guarda** en la BD, ni en logs ni en Blob. Se procesa en memoria y se descarta.
   - `ai_usage` registra solo métricas, sin texto.
   - Pide permiso de micrófono con una explicación previa amable. Si se deniega, ofrece el teclado.
   - Actualiza `/privacidad`, `docs/ARY_SECURITY_AND_PRIVACY.md` y `docs/PRIVACY_COMPLIANCE_REVIEW.md`: finalidad, base, proveedor Google, sin almacenamiento y menores en kiosco público. Avisa en pantalla de que la voz se envía a un proveedor de IA.
   - En el kiosco, un indicador visible de «micrófono activo».
4. **CSP y permisos.** Ajusta `Permissions-Policy` para permitir `microphone=(self)` **solo** en `/kiosco` y `/experiencia`, y mantenlo bloqueado en el resto. Comprueba la CSP para `media-src`/`blob:` del audio.

**Gemini Live.** La cuenta tiene modelos `*-live` y `native-audio`. **No** lo implementes ahora, pero documenta en `ARY_AI.md` un plan breve para migrar a Live (WebSocket con token efímero) si la latencia lo pide.

## 4. Sin internet

**Cuándo.** Cuando el kiosco detecta offline o un health degradado.

**Qué se muestra:**

- `ary-sin-conexion.webp`.
- Un mensaje amable, por ejemplo «Uy… me quedé sin señal. Dame un momentito».
- Micrófono deshabilitado.
- Reintento automático como ahora.

**Audio.** Puede sonar un audio local pregrabado: genera en build o en un script un WAV corto del mensaje offline con el TTS y guárdalo en `public/assets/ary/voz/`, o simplemente no suenes. Nada de llamadas de red en offline.

**Puente.** El puente local del robot sigue funcionando: gesto de «cansado» o `offline`.

## 5. Calidad

- **Vitest:**
  - esquemas Zod de voz (`displayText`/`spokenText`/`transcript`);
  - `/api/voice/speak` rechaza texto libre y respeta los límites;
  - `/api/voice/ask` rechaza audio enorme o sin CSRF;
  - el audio no se persiste;
  - mapa de estado → imagen;
  - máximo un manerismo y ninguno en temas sensibles.
  - Simula Gemini con mocks; **nunca** llames a Gemini real desde los tests.
- **Playwright:** reescribe los E2E de etapas 2 y 4A afectados por el nuevo flujo, manteniendo lo que validan: QR, privacidad, inactividad, offline, presencia y sin sesión automática.
  - Simula el audio con rutas mockeadas y permisos de micrófono falsos de Chromium (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`) solo en la config de test.
  - Capturas de los estados de Ary en 1280, 1920, 390 y 360 px en `docs/screenshots/stage6/`.
- **Rendimiento en Pi.** Mantén el presupuesto del kiosco (`npm run check:kiosk-budget`). Las imágenes webp ya están optimizadas. No metas librerías pesadas de UI ni de audio.
- **Comprobaciones:** `lint`, `typecheck`, `test` y `build` deben pasar, o documenta el error exacto del sandbox. El revisor ejecuta los E2E fuera del sandbox.

## Restricciones

- No hagas commits, push ni despliegues. No envíes correos.
- Puedes hacer **como máximo 4** llamadas reales a Gemini para validar la integración: una de TTS para comprobar la voz elegida, una de audio a respuesta y dos de reserva. No imprimas la clave.
- Hoy los modelos grandes de Google devuelven 503 con frecuencia. `gemini-3.5-flash-lite` fue el único que respondió (6–7 s). Diseña para fallos: timeouts, degradar a texto y nunca colgar la UI.
- No toques `legacy/`, la landing ni sus assets.
- Ignora memorias de otros proyectos. No existe ninguna prohibición de usar Gemini: está autorizado como proveedor de Ary.
- No metas rodeos de sandbox en la configuración.

## Entrega

Al terminar, imprime:

- archivos;
- variables nuevas (`AI_TTS_MODEL`, `AI_TTS_VOICE`, …) y sus valores por defecto;
- la voz elegida;
- la latencia medida;
- los comandos con su resultado;
- los bloqueos;
- lo que debe hacer el propietario: subir `ary-sin-conexion.webp` y elegir la voz definitiva.
