# Ary — Etapa 9D: voz por defecto, chat opcional

Fecha: 2026-11-11. Implementación local en `D:\Ary The Parrot`.

La funcionalidad está implementada y las comprobaciones estáticas/unitarias pasan. La etapa **no está totalmente verificada**: build, ejecución E2E y ambas pasadas visuales encuentran los bloqueos del entorno descritos abajo. No se declara aceptación visual ni validación de audio en dispositivo real.

## Archivos

Nuevos:

- `src/components/voice-turns.ts`: estados de turnos, detección de silencio, tiempo de lectura y almacenamiento seguro de `ary_mode`.
- `app/stage9d.css`: composición de Voz, Ary grande, micrófono de 88/112 px, subtítulos, adaptación y reduced motion.
- `tests/unit/stage9d.test.ts`: seis pruebas de estados, silencio, cancelación, límite, persistencia, lectura y síntesis corta.
- `tests/e2e/stage9d.spec.ts`: diez casos, incluidos dos recorridos independientes de capturas ES/EN.
- `docs/ARY_STAGE9D_REPORT.md`, `docs/evidence/stage9d/visual-review.md` y `docs/screenshots/stage9d/README.md`.

Modificados:

- `src/components/ary-chat.tsx`: Voz por defecto, gesto inicial/consentimiento, saludo, último intercambio, chips, pausa, cambio de modo, persistencia y respaldo a Chat.
- `src/components/use-ary-voice.ts`: turnos automáticos, silencio, micrófono cerrado durante audio, cancelación de pistas/peticiones, permiso previo al saludo, lectura en fallo y contador de errores TTS.
- `src/components/ary-stage.tsx`: tamaño de imagen para Voz y estados identificables.
- `src/components/kiosk.tsx`: reinicio en Voz, consentimiento después del primer toque, saludo por presencia sin activar escucha y actividad de conversación para el contador de inactividad.
- `src/server/ai/safety.ts`: texto hablado de hasta 400 caracteres, sin URLs ni listas extensas; conserva los subtítulos completos.
- `app/layout.tsx`: importa los estilos de la etapa.
- `playwright.config.ts`: proyecto `stage9d`, con micrófono simulado.
- `tests/e2e/{stage8-helpers,voice-helpers}.ts`: `switchToChat`, entrada por correo en Chat cuando el caso lo requiere y espera del arranque de kiosco.
- `tests/e2e/{stage2,stage4a,stage7,stage8,stage9}.spec.ts`: adaptación de las suposiciones de entrada por texto y botones del kiosco.
- `tests/unit/language-render.test.tsx`: texto inicial inglés actualizado a `Talk to Ary`.

No hubo migraciones, dependencias ni cambios de APIs públicas. Se reutilizan `SourceCarousel`, las rutas de voz y `cue: welcome`; `keyboard` ya existía en `icons.tsx`. No fue necesario modificar Experience ni VoiceShell.

## Flujo de estados

```text
Inactivo → toque + consentimiento + permiso → saludo → hablando
Hablando → audio terminado → escuchando
Hablando → toque/interrupción → escuchando
Escuchando → voz + 1,2 s de silencio / máximo 15 s → pensando → hablando
Escuchando → 8 s sin voz → inactivo, sin envío ni reapertura en bucle
Primer fallo TTS → subtítulos + espera de lectura → escuchando
Permiso denegado / sin capacidades / segundo fallo TTS → Chat + aviso
Cualquier turno → pausa / Chat / salida → captura cerrada
```

La espera de lectura es `min(8000, 2000 + 40 × caracteres)` milisegundos. El analizador usa un umbral de nivel normalizado de 0,08; se comprueba cada 120 ms. Si no se puede crear el analizador, la escucha automática cancela a los ocho segundos para no enviar silencio. El Chat conserva la captura manual y su límite de 15 segundos.

Voz muestra únicamente el último mensaje del visitante y el último de Ary, con `aria-live`, fichas y seguimientos. El historial permanece en memoria y en el mecanismo existente del servidor; cambiar de modo no lo borra. Los chips pueden interrumpir/descartar una captura activa para enviar texto y obtener audio. Chat conserva el botón de silencio. Entrar de nuevo a Voz requiere gesto para iniciar o reanudar el flujo.

`localStorage.ary_mode` se lee y escribe dentro de manejo de errores. Sin valor válido se usa Voz. El respaldo automático a Chat no sobrescribe la preferencia voluntaria. El kiosco ignora la preferencia al montar cada turno y vuelve a Voz/inglés al finalizar por inactividad.

El micrófono solo se solicita después de aceptar el consentimiento; se muestra indicador también al adquirirlo. Las pistas de la comprobación de permiso se cierran antes del saludo. Reproducción y captura se excluyen; no se conservan dos audios. Cambiar a Chat, pausar, ocultar/salir de la página o desmontar cancela los recursos. Un saludo pendiente queda invalidado al pausar o cambiar de modo. La presencia del puente puede iniciar un saludo en un kiosco autorizado, pero no activa turnos automáticos ni solicita el micrófono. La reproducción sin gesto sigue sujeta a las restricciones del navegador y puede quedar en subtítulos.

## Comandos y resultados

Node disponible: `v26.2.0`; `package.json` prescribe `24.x`. No se instaló otra versión ni herramientas.

| Comando | Resultado |
| --- | --- |
| `npm run lint` | PASS, exit 0, sin advertencias |
| `npm run typecheck` | PASS, exit 0 |
| `npm test -- --maxWorkers=2` | PASS: 284 pruebas en 21 archivos; última ejecución completa 35,97 s |
| `npx playwright test --list --project=stage9d` | PASS: diez casos descubiertos |
| `npx playwright test --project=stage9d --workers=1` | EXIT 1: `Error: spawn EPERM` antes de ejecutar casos |
| `node scripts/e2e-server.ts` | EXIT 1: Next dev no puede lanzar su proceso, `spawn EPERM` |
| `npm run build:empty-env` | Build normal en copia aislada sin `.env` ni secretos heredados. Último intento: Turbopack compila en 5,4 s; `Running TypeScript ... spawn EPERM`, exit 1 |
| `git -c core.whitespace=cr-at-eol diff --check` | PASS |
| Inventario CUA | Sin navegador conectado: `The browser access host is unavailable`; no servidor local operativo para revisión nativa |

Durante la primera ejecución unitaria falló una expectativa heredada de `Start` en el HTML inglés del kiosco. Se actualizó a la acción nueva `Talk to Ary`; la suite completa pasó después. TypeScript también detectó un cast de fixture demasiado estricto y un chequeo booleano asíncrono que se sustituyó por generación de inicio. No se ocultan fallos pendientes como pruebas pasadas.

Los E2E cubren entrada de Voz, saludo/audio terminado/escucha automática, turno con transcripción y respuesta, persistencia de Chat, permiso denegado, falta de MediaRecorder, ocho segundos sin voz sin envío/bucle, interrupción/cierre de pistas, dos fallos TTS y kiosco inglés sin acceso al micrófono previo al toque. Usan WAV sintético y respuestas simuladas; el servidor de pruebas vacía las credenciales del proveedor y utiliza una base sintética local.

## Bloqueos y pendientes

No se pudo ejecutar el navegador ni mirar capturas de esta implementación. [Registro visual](evidence/stage9d/visual-review.md): **pasada 1 y pasada 2 pendientes**, conforme a `visual-review-loop`. Se prepararon 48 capturas a 390/768/1440 px, ES/EN, inactivo/escuchando/hablando con tarjeta/Chat. También se debe revisar el borde de 360/430/1920 px, reduced motion, offline, QR e interacción de teclado.

En un entorno con procesos autorizados, ejecutar build y Playwright y completar las dos inspecciones reales, corrigiendo y recargando. Quedan además pruebas de micrófono físico, eco, sensibilidad/ruido de sala, autoplay móvil y puente local físico. No se midió latencia real ni se probó producción.

No se hicieron commits, push, despliegues, correos ni llamadas reales a Gemini. No se usó Gemini para implementación, análisis, delegación o revisión. No se modificaron `data/catalog/`, `public/assets/catalog/` ni `docs/catalog/`; se preservó el trabajo paralelo. Se ignoraron `outputs/` y las memorias de otros proyectos. Todos los archivos de texto de esta entrega se escribieron mediante `apply_patch` en UTF-8.
