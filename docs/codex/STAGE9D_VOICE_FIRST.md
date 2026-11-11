# Codex — Etapa 9D: Ary primero por voz, el chat es opcional

Sigues en `D:\Ary The Parrot`. Etapas 1–9C desplegadas en https://arytheparrot.app.

**En paralelo**, otro trabajo modifica **solo** `data/catalog/`, `public/assets/catalog/` y `docs/catalog/`. **No toques esas carpetas.**

Lee primero:

- `docs/ARY_STAGE6_REPORT.md` (voz)
- `docs/ARY_STAGE9C_REPORT.md`
- `src/components/use-ary-voice.ts`
- `src/components/ary-chat.tsx`
- `src/components/experience.tsx`
- `src/components/kiosk.tsx`
- `src/components/voice-shell.tsx`
- `src/components/ary-stage.tsx`
- `src/components/source-carousel.tsx`
- `app/globals.css`, `app/stage8.css`, `app/stage9.css`
- `src/server/ai/voice.ts`
- `tests/e2e/voice-helpers.ts`
- `tests/e2e/stage6.spec.ts`

## Qué pide el propietario (11-11-2026)

> «Ary funciona de primera mano con un chat que habla, y lo que debe hacer realmente es que tú hables con él. Si quieres, lo cambias a modo de chateo. De primera mano, Ary debe hablar contigo y luego pasa a modo de chateo si uno quiere. De primera mano debe ser modo audio.»

Hoy `/experiencia` abre un chat de texto con micrófono opcional. Debe ser al revés: **una conversación de voz por defecto**, con un botón para pasar a **modo chat**.

## 1. Dos modos: «Voz» (por defecto) y «Chat»

**Modo Voz.** Es la vista inicial tras el correo de bienvenida, en web y en kiosco.

- **Composición:**
  - Ary grande y centrado (`AryStage`), con estados visibles y animados: escuchando, pensando, hablando, inactivo y sin conexión;
  - debajo, **un gran botón circular de micrófono** con onda o nivel en vivo;
  - las etiquetas «Toca para hablar» / «Tap to talk», «Te escucho…» / «Listening…», «Pensando…» / «Thinking…» y «Ary está hablando — toca para interrumpir» / «Ary is talking — tap to interrupt».
- **Subtítulos** siempre visibles, grandes y legibles, con `aria-live`:
  - lo último que dijo el visitante (transcripción);
  - lo que dice Ary (`displayText`).
- **Tarjetas.** Si la respuesta cita fichas, el carrusel de la etapa 9 (foto, Maps, guardar) aparece bajo los subtítulos, compacto.
- **Seguimientos.** Los `followUps` como chips: al tocarlos se envían como texto y Ary responde **por voz**.
- **Cambio de modo.** Un botón claro **«Escribir»** / **«Type instead»** (icono de teclado) pasa a Modo Chat. No muestres el historial completo en Modo Voz, solo el último intercambio. Añade un enlace «Ver conversación» que abre el Modo Chat.

**Modo Chat.** Es el chat actual, con su historial, barra compacta y micrófono.

- Botón claro **«Hablar con Ary»** / **«Talk to Ary»** para volver al Modo Voz.
- En Modo Chat, la voz de Ary se mantiene según el botón de silencio actual.

**Persistencia.** Guarda la elección en `localStorage` (`ary_mode`), dentro de `try/catch`. Si el visitante eligió Chat, la próxima vez abre en Chat. Por defecto, **Voz**.

**Respaldo automático a Chat**, con un aviso amable y no técnico:

- el navegador no tiene `MediaRecorder` ni `getUserMedia`;
- el visitante deniega el micrófono;
- falla el TTS de forma repetida (2 veces). En ese caso, avisa de que Ary seguirá por escrito.

## 2. Conversación manos libres

- **El primer toque es obligatorio:** el navegador exige un gesto para el audio y el micrófono. La primera pantalla del Modo Voz muestra **«Hablar con Ary»** (botón grande). Al tocarlo:
  1. se pide el consentimiento de micrófono existente, si no se dio;
  2. Ary saluda **por voz** con el `cue: "welcome"`;
  3. al terminar el saludo, **empieza a escuchar automáticamente**.
- **Turnos automáticos:**
  - cuando Ary termina de hablar (`onEnded`), se abre el micrófono automáticamente;
  - **fin por silencio:** con el analizador de nivel existente, detecta voz (nivel por encima del umbral) y, tras ~1,2 s de silencio después de haber hablado, para y envía;
  - máximo de 15 s;
  - si en ~8 s no se detecta voz, se cierra el micrófono **sin enviar** y se muestra «Toca para hablar». **Nunca escuches en bucle infinito.**
- **Interrumpir.** Tocar el micrófono mientras Ary habla detiene el audio y empieza a escuchar.
- **Pausa.** Un botón pequeño de pausa o silencio detiene los turnos automáticos.
- **Privacidad:**
  - el indicador de micrófono activo es muy visible;
  - nunca se graba sin indicador;
  - al salir de la página o pasar a Chat, el micrófono se cierra.
- **Kiosco:**
  - mismo Modo Voz por defecto;
  - con presencia (puente local), Ary saluda, pero **no abre el micrófono sin un toque**, salvo que ya haya una conversación activa en ese turno;
  - tras la inactividad, se reinicia en Modo Voz e inglés, como hasta ahora;
  - el QR para continuar en el teléfono se muestra también en Modo Voz.

## 3. Calidad del audio

- Mientras Ary habla, el micrófono está cerrado, para evitar el eco de su propia voz.
- No se reproducen dos audios a la vez: interrumpe el anterior.
- La respuesta hablada no lee URLs ni listas largas. Mantén `spokenText` corto.
- Si el TTS falla, se muestran los subtítulos y sigue el flujo: el micrófono se abre igualmente tras un breve retardo de lectura (≈ 2 s más 40 ms por carácter, con un máximo de 8 s).

## 4. Diseño

- Coherente con la landing cultural y las etapas 8/9.
- Móvil primero, de 360 a 430 px sin cortes, y también de 768 a 1920 px.
- El botón del micrófono mide al menos 88 px en móvil y 112 px en escritorio, con un contraste AA.
- Respeta `prefers-reduced-motion`.
- Iconos SVG de `src/components/icons.tsx`: añade `keyboard` si falta.

## 5. Pruebas

**Vitest.** Lógica pura en un módulo aparte, por ejemplo `src/components/voice-turns.ts`:

- máquina de estados de turnos;
- detección de silencio con niveles simulados (voz → silencio de 1,2 s → enviar; 8 s sin voz → cancelar sin enviar; 15 s → enviar);
- modo por defecto «voice»;
- persistencia y lectura segura de `ary_mode`.

**Playwright** (el proyecto ya usa `--use-fake-device-for-media-stream` y `mockSpeech`). Crea `tests/e2e/stage9d.spec.ts`:

- tras el correo de bienvenida, `/experiencia` abre en **Modo Voz**: botón grande «Hablar con Ary» visible y sin campo de texto visible;
- tocar «Hablar con Ary» → saludo (audio simulado que reproduce y termina) → el micrófono pasa a «Te escucho…» automáticamente;
- turno completo con proveedor simulado: la transcripción y la respuesta aparecen en los subtítulos, y vuelve a escuchar tras el audio;
- «Escribir» → Modo Chat con historial y campo de texto; recargar → sigue en Chat; «Hablar con Ary» → vuelve a Voz;
- micrófono denegado (permisos de contexto) → Modo Chat con aviso;
- kiosco: Modo Voz por defecto en inglés, sin micrófono abierto sin toque;
- capturas en `docs/screenshots/stage9d/` a 390, 768 y 1440 px, ES/EN, en los estados inactivo, escuchando, hablando con tarjeta y Chat.

Actualiza los E2E existentes que asumían el chat de texto como vista inicial. Lo más simple: que el helper `emailStart` o `startChat` pase a Modo Chat cuando la prueba lo necesite, con un helper `switchToChat(page)`.

**Comprobaciones:** `lint`, `typecheck` y `test` deben pasar. `build` y Playwright pueden fallar con `spawn EPERM` en tu sandbox; si pasa, documéntalo y el revisor los ejecutará.

## Restricciones

- Sin commits, push, despliegues ni correos.
- Sin llamadas reales a Gemini.
- No imprimas secretos.
- No toques `data/catalog/`, `public/assets/catalog/` ni `docs/catalog/`.
- Ignora `outputs/` y las memorias de otros proyectos.
- No traduzcas código.
- Escribe **siempre en UTF-8** con `apply_patch`.

## Entrega

Escribe `docs/ARY_STAGE9D_REPORT.md` e imprime:

- archivos;
- diagrama corto de estados de voz;
- comandos y resultados;
- bloqueos.
