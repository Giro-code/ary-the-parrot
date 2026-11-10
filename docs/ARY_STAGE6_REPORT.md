# Etapa 6 · chat por voz de Ary

Reanudación del 10 de noviembre de 2026 en el árbol existente, sin commits/push/despliegues/correos. No se usó Gemini para implementar/revisar y no se hicieron nuevas peticiones al proveedor de voz. No se imprimieron secretos. `outputs/` y memorias de otros proyectos se ignoraron.

## Resultado implementado

Chat compartido en `/kiosco` y `/experiencia`: escenario de Ary, burbujas y avatar, micrófono central de 76 px, teclado opcional, mute, subtítulos y respuestas rápidas. Preferencias por conversación, país voluntario y contratos actuales de sesión/guardados/QR conservados. Fichas con fuente/Guardar/Abrir y QR con confirmación de dos dígitos dentro del chat. No hay formulario por pasos ni pantalla separada de resultados. Inactividad de 90 s, aviso, Terminar, presencia y reconexión del kiosco se conservan.

Una llamada de audio a `chat()` produce transcripción y respuesta estructurada; otra sintetiza solo un mensaje propio ya validado. Audio de visitante exclusivamente en memoria, textos cifrados temporales, métricas sin contenido. CSRF, límites, contenedores, tamaño y propiedad probados. Offline cancela grabación/reproducción, deshabilita micrófono y usa pensar gris mientras falta el asset. `speaking` sigue los eventos del audio real y el mismo estado alimenta imagen/robot. Crossfade de 200 ms y reduced-motion en CSS; su percepción visual no se ha verificado.

## Correcciones al retomar

- Cambiar al teclado ahora cancela y libera las pistas del micro; mute conserva grabación/transcripción activas.
- Un resultado de voz libera el estado processing antes de comenzar la reproducción; una tarea cancelada no limpia el estado de otra más reciente.
- Fallos de reproducción/decodificación informan del respaldo por texto. El scroll automático queda dentro de la conversación, con wrapping para texto largo.
- Gemini 3.8 recibe estilo en `speechMetadata`, separado del transcript literal; evita leer instrucciones de producción. Se preserva la alternativa configurable 2.5 y el lector de WAV/PCM.
- Derivaciones sensibles tienen prioridad sobre frases de país; elegir English por voz obtiene la pregunta siguiente en inglés.
- Celebración de canje limitada a 2,5 s; preferencias del kiosco sin campos extra para evitar escrituras redundantes; gris solo en fallback offline. `next/image` usa `preload` solo en presentar (sustituye `priority`, deprecado en Next 16), con `sizes` por viewport.
- El script real comprueba primero el consumo acumulado, preservando la evidencia previa. Timeout explícito de 30 s solo para el test de bootstrap con arranque en frío de PGlite, tras dos fallos intermitentes a 5 s; mismas aserciones.
- Documentación actualizada: privacidad, voz/Live, matriz, README e informe/evidencias.

## Variables y voz

| Variable de servidor | Predeterminado | Alcance |
| --- | --- | --- |
| `AI_TTS_MODEL` | `gemini-3.8-flash-lite-tts` | Modelo TTS configurable |
| `AI_TTS_VOICE` | `Sulafat` | Voz provisional |
| `AI_TTS_SESSION_PER_MINUTE` | `8` | Máximo configurable 20 |
| `AI_TTS_GLOBAL_PER_MINUTE` | `30` | Máximo configurable 120 |
| `GEMINI_API_KEY` | Sin valor | Se reutiliza; nunca pública |
| `AI_MODEL` | `gemini-3.5-flash-lite` | Existente; audio → respuesta |

Sulafat se eligió por la descripción oficial femenina/cálida. El estilo pide una cotorra amable/expresiva, español con acento caribeño suave e inglés claro. El propietario debe escuchar y elegir la voz definitiva. Solo modelo y voz cambian por entorno; no se solicita una clave nueva. [Documentación y fuentes](ARY_AI.md).

## Llamadas reales y latencia heredada

**4/4 llamadas consumidas**, cero nuevas en esta reanudación: una en `live-voice-attempt-1.json` y tres en `live-voice.json`. [Registro acumulado](evidence/stage6/call-ledger.json). No volver a ejecutar una validación real en esta etapa.

TTS de muestra: **4677 ms**. Audio → respuesta: **4158 ms, no validada como Gemini**, sin código explicativo guardado. TTS de la respuesta resultante: **7578 ms**. Pregunta → WAV: **11 736 ms**, excluye captura/subida/reproducción/hardware. Primer intento: `invalid_tts_audio`. Se preservan los dos WAV sintéticos existentes, sin generar archivos de audio adicionales.

Estas cifras son anteriores a la corrección de estilo 3.8; **no prueban transcripción correcta, voz final ni latencia completa de usuario**. No se atribuye causa al fallo no documentado. Se mantiene validar respuesta completa → TTS, sin hablar texto no validado. No se implementó streaming ni Live; hay plan posterior con token efímero/WebSocket en `ARY_AI.md`.

## Comprobaciones y bloqueos

Resultados detallados y actualizados en [checks.json](evidence/stage6/checks.json). Lint, typecheck, unitarias y presupuesto se ejecutan sobre el árbol final. Build, Playwright y dev encuentran `spawn EPERM`; no se añadieron opciones de Next ni rodeos del sandbox.

Las unitarias cubren schemas, tamaño/CSRF, límites/cache/propiedad TTS, WAV/PCM, una petición de audio, privacidad de persistencia, transcripción inválida, clasificación sensible, idiomas, cierre concurrente y manerismos. Los E2E de 2/3/4A y regresión se adaptaron al nuevo flujo; etapa 6 añade grabación Chromium falsa, interrupción, mute, permiso denegado, límite 15 s, cancelación de pistas, reproducción inválida, políticas y capturas por estado. Todas las peticiones de proveedor en tests están mockeadas o con clave vacía.

**Las dos pasadas visuales, capturas nuevas, E2E ejecutados y comparación de cero píxeles siguen pendientes.** [Registro exacto del bloqueo y recorrido](evidence/stage6/visual-review.md). El presupuesto de chunks no acredita build completo ni rendimiento de Pi. Tampoco se validaron micrófono físico, autoplay móvil, puente físico, Google final, Neon ni producción en esta reanudación.

## Archivos del trabajo acumulado

- UI/rutas: `app/{kiosco,experiencia}/page.tsx`, `app/globals.css`, `src/components/{ary-chat,ary-stage,voice-shell,kiosk,experience,information}.tsx`, `src/components/use-ary-voice.ts`, `src/conversation.ts` y `src/server/ary-assets.ts`.
- Servidor: `app/api/voice/{ask,speak}/route.ts`, `app/api/[...path]/route.ts`, `src/server/ai/{chat,providers,safety,voice}.ts`, `src/server/config.ts`.
- Configuración: `.env.example`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `playwright.config.ts`; sin dependencias nuevas. Exclusión de `outputs/` en lint/tsc.
- Pruebas/herramientas: `tests/unit/{stage6,stage4a,deploy-bootstrap}.test.ts`, `tests/e2e/{stage6,voice-helpers,stage2,stage3,stage4a,legacy-regression}.ts` (los casos usan sufijo `.spec.ts`), `scripts/verify-voice.ts`; presupuesto emitido por el script existente en `docs/evidence/stage2/kiosk-budget.json`.
- Documentación: `README.md`, `docs/{ARY_AI,ARY_SECURITY_AND_PRIVACY,PRIVACY_COMPLIANCE_REVIEW,FEATURE_MATRIX,ARY_STAGE6_REPORT}.md` y `docs/evidence/stage6/`.

No se tocaron `legacy/`, los archivos de la landing ni sus assets. No se eliminó ni revirtió el trabajo heredado.

## Pendiente del propietario/revisor

Añadir `public/assets/ary/ary-sin-conexion.webp`, elegir la voz definitiva y revisar condiciones/privacidad de voz antes de uso público. El fallback actual funciona sin ese archivo. Ejecutar build/E2E y realizar las dos pasadas reales en un entorno con permiso de procesos; después comprobar micrófono/audio y latencia en dispositivo/Pi. Estas verificaciones pendientes impiden declarar la etapa totalmente verificada.

## Verificación del revisor (2026-11-10)

- `lint`, `typecheck`, 148 pruebas unitarias y `build`: **PASS** fuera del sandbox.
- Playwright: **101 pasan y 1 se omite**, con 0 píxeles en la landing. Ajustes del revisor:
  - Cuatro aserciones buscaban la respuesta en el último mensaje de Ary; ahora el último es la oferta fija «¿Quieres llevarte esto en tu teléfono?», que es lo que pide el diseño.
  - Un fallo puntual de escritura de captura en Windows se repitió y pasó.
- **Kiosco.** Mientras «Comprobando conexión…», Ary mostraba la imagen de sin conexión. Ahora el estado de comprobación es `idle`.
- **Gemini lite.** En producción, varias respuestas válidas acababan en `ungrounded_output` porque el modelo nombraba la ficha sin rellenar `citedItemIds`. Si no cita, se citan las fichas publicadas cuyo título exacto aparece en el texto, como máximo 3 y solo del contexto permitido. Hay prueba unitaria.
- **TTS en vivo** con `gemini-3.8-flash-lite-tts` y voz `Sulafat`: dos frases, **3,5 s y 2,4 s**. Muestras locales, no versionadas, en `docs/voice-samples/`.
