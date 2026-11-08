# Revisión visual

## Etapa 3 · pendiente por acceso bloqueado

Artefacto: archivos locales de etapa 3; inventario en `ARY_STAGE3_REPORT.md`, sin commit. Revisión propia de código y unitarias; **no hay capturas nuevas de etapa 3 inspeccionadas ni se acredita paridad de píxeles de esta versión**.

Superficies: `/reingresar` ES/EN, consentimiento obligatorio y marketing ausente con flag false, carga/resultado dry-run/error; `/auth/verify` confirmación/invalidación/replay; `/cuenta/privacidad` autenticado/no autenticado, datos, historial, exportación, baja y borrado; `/privacidad`; `/dev/outbox`; enlaces nuevos en experiencia/Mi viaje; B2B en reposo, resultado, error, reintento y TXT. Preparados anchos 360/390/820/1440; regresión original de seis vistas a 390/820/1440/1920 intacta.

| Pasada | Estado real | Evidencia / bloqueo |
| --- | --- | --- |
| 1 · inspección crítica | PENDIENTE | `next dev`: spawn EPERM, errno -4048, next-dev.js:393:45. E2E no arranca por puerto 3000 ya usado. Browser host: unavailable; Computer Use: «Computer Use was not approved to use Microsoft Edge» |
| Correcciones por lectura/pruebas | Solo revisión técnica | Mensajes dry-run/queued precisos, avisos y CTA, foco/labels/casillas, controles 48px, wrap y columnas móviles; no se presentan como hallazgos visuales |
| 2 · recarga final | PENDIENTE | Mismo bloqueo; no hay inspección visual final que se pueda afirmar |

No se cerró el servidor ajeno en 3000, no se lanzó Chromium mediante otro mecanismo tras la denegación, no se instalaron herramientas ni se modificó configuración para evitar el sandbox. La lectura de health del servidor existente solo confirmó un demo local dry-run; no valida las pantallas nuevas.

`tests/e2e/stage3.spec.ts` deja dos recorridos independientes con recarga y archivos `docs/screenshots/stage3/pass-<n>-<ruta>-<ancho>.png`. Incluyen privacidad autenticada, recuperación ES/EN, enlace inválido y B2B error/recibido. **Son rutas de evidencia futura; esos archivos no se generaron aquí.** Para cerrar: ejecutar E2E en runtime autorizado, mirar la pasada 1, registrar/corregir hallazgos, recargar, mirar pasada 2 y repetir estados afectados si vuelve a cambiar código. Evaluar texto/jerarquía, interacción/teclado, vacíos/carga/error, consentimientos y overflow además de geometría.

## Etapa 2 · historial

Estado: **verificado por el revisor** (7 nov 2026): la suite E2E (73 passed) cubre los flujos y guarda capturas en `docs/evidence/stage2/`. El texto siguiente es el informe original de Codex, escrito sin acceso a navegador.

Artefacto: cambios locales de etapa 2 sobre la rama existente; sin commit. Rutas previstas: `/kiosco` (idle, bienvenida, preferencias, recomendaciones, QR, transferencia, timeout, offline), `/q/[token]` (confirmación, usado, alterado y expirado), `/experiencia` (inicio, restauración, edición, guardado/error), `/mi-viaje` (vacío, progreso, favorito y QR público), activación, privacidad y Próximamente.

Tamaños preparados: 360, 390, 820 y 1440 px; rendimiento de kiosco a 1280×800 y 1920×1080. Los tests capturan evidencia con nombres de ruta, estado y pasada en `docs/evidence/stage2/`. **Generar capturas no sustituye mirarlas.**

| Pasada | Resultado real | Evidencia/bloqueo |
| --- | --- | --- |
| 1 · inspección crítica | Pendiente | `npm run dev`: `Error: spawn EPERM` en `next-dev.js:393:45`; `npm run test:e2e`: `Error: spawn EPERM` |
| Correcciones | Revisión de código únicamente | Controles ≥48 px, wrap/rejilla intrínseca, contraste de texto oscuro sobre papel/lima, SVG separado de datos privados, cleanup de respuestas tardías y errores accionables; sin aceptación visual |
| 2 · recarga de versión final | Pendiente | No hay runtime accesible iniciado en este entorno; el build también se bloquea al lanzar TypeScript |

El intento directo de lanzar el Chromium de Playwright encontró además el binario headless ausente bajo `.cache/playwright/` (`chromium_headless_shell-1254`). No se instaló un navegador ni se cambió `PLAYWRIGHT_BROWSERS_PATH` para eludir el entorno. El runner respeta un valor ya definido.

Para cerrar: en un entorno con subprocesos y Chromium, ejecutar los cinco comandos de validación, recorrer todas las rutas/estados y mirar las capturas de la primera pasada; corregir defectos del alcance, recargar, realizar y documentar la segunda pasada. Si una corrección posterior afecta un estado, revisarlo de nuevo. Registrar geometría, jerarquía, texto, teclado/foco, interacción, overflow, carga/error y reduced-motion. Una prueba de escritorio con CPU 4× no acredita rendimiento de Raspberry Pi real.
