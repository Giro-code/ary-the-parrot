# Revisión visual de etapa 4A

Artefacto local final de esta tarea, sin commit. Rutas afectadas `/kiosco`, `/experiencia`, `/privacidad` y el resultado preparado de `/#solicitar`. Se preservan HTML/CSS de la landing en reposo y recursos originales.

| Pasada | Estado | Evidencia |
| --- | --- | --- |
| 1, inspección crítica en navegador | PENDIENTE | next dev y runner Playwright fallan con spawn EPERM. El inventario CUA devuelve Browsers: The browser access host is unavailable |
| Correcciones técnicas | Realizadas, sin aceptación visual | Consentimiento requerido/checkbox de tamaño propio, estados de salud, texto plano/fuentes, foco, wrapping, error/límite y ausencia de puente |
| 2, recarga de versión final | PENDIENTE | No se consiguió un runtime/navegador autorizado para inspeccionar la UI |

Los errores exactos están en `docs/evidence/stage4a/{dev,e2e,build}.txt`. Los E2E preparan recorridos independientes para 360, 390, 820 y 1440 px, con chat/fuentes y derivación, y las pruebas B2B de etapa 3 ahora usan el segundo paso integrado. No se han generado ni mirado capturas de la etapa 4A. La regresión actual de 0 píxeles sigue exigida y pendiente, con tolerancia original intacta.

Para cerrar, ejecutar en un runtime autorizado, mirar la primera pasada, registrar/corregir defectos del alcance, recargar y mirar la segunda. Repetir los estados afectados tras cualquier corrección posterior. Revisar jerarquía, textos, teclado/foco, carga, error, límite, consentimiento, fuente y robot desconectado además de geometría. La prueba SSE sintética verifica un puente de test, no hardware.

---

## Historial anterior

# Revisión visual

## Etapa 3 · pendiente por acceso bloqueado

Artefacto: archivos locales de etapa 3; inventario en `ARY_STAGE3_REPORT.md`, sin commit. Revisión propia de código y unitarias; **no hay capturas nuevas de etapa 3 inspeccionadas ni se acredita paridad de píxeles de esta versión**.

Superficies: `/reingresar` ES/EN, consentimiento obligatorio y marketing ausente con flag false, carga/resultado dry-run/error; `/auth/verify` confirmación/invalidación/replay; `/cuenta/privacidad` autenticado/no autenticado, datos, historial, exportación, baja y borrado; `/privacidad`; `/dev/outbox`; enlaces nuevos en experiencia/Mi cultura; B2B en reposo, resultado, error, reintento y TXT. Preparados anchos 360/390/820/1440; regresión original de seis vistas a 390/820/1440/1920 intacta.

| Pasada | Estado real | Evidencia / bloqueo |
| --- | --- | --- |
| 1 · inspección crítica | PENDIENTE | `next dev`: spawn EPERM, errno -4048, next-dev.js:393:45. E2E no arranca por puerto 3000 ya usado. Browser host: unavailable; Computer Use: «Computer Use was not approved to use Microsoft Edge» |
| Correcciones por lectura/pruebas | Solo revisión técnica | Mensajes dry-run/queued precisos, avisos y CTA, foco/labels/casillas, controles 48px, wrap y columnas móviles; no se presentan como hallazgos visuales |
| 2 · recarga final | PENDIENTE | Mismo bloqueo; no hay inspección visual final que se pueda afirmar |

No se cerró el servidor ajeno en 3000, no se lanzó Chromium mediante otro mecanismo tras la denegación, no se instalaron herramientas ni se modificó configuración para evitar el sandbox. La lectura de health del servidor existente solo confirmó un demo local dry-run; no valida las pantallas nuevas.

`tests/e2e/stage3.spec.ts` deja dos recorridos independientes con recarga y archivos `docs/screenshots/stage3/pass-<n>-<ruta>-<ancho>.png`. Incluyen privacidad autenticada, recuperación ES/EN, enlace inválido y B2B error/recibido. **Son rutas de evidencia futura; esos archivos no se generaron aquí.** Para cerrar: ejecutar E2E en runtime autorizado, mirar la pasada 1, registrar/corregir hallazgos, recargar, mirar pasada 2 y repetir estados afectados si vuelve a cambiar código. Evaluar texto/jerarquía, interacción/teclado, vacíos/carga/error, consentimientos y overflow además de geometría.

## Etapa 2 · historial

Estado: **verificado por el revisor** (7 nov 2026): la suite E2E (73 passed) cubre los flujos y guarda capturas en `docs/evidence/stage2/`. El texto siguiente es el informe original de Codex, escrito sin acceso a navegador.

Artefacto: cambios locales de etapa 2 sobre la rama existente; sin commit. Rutas previstas: `/kiosco` (idle, bienvenida, preferencias, recomendaciones, QR, transferencia, timeout, offline), `/q/[token]` (confirmación, usado, alterado y expirado), `/experiencia` (inicio, restauración, edición, guardado/error), `/mi-cultura` (vacío, progreso, favorito y QR público), activación, privacidad y Próximamente.

Tamaños preparados: 360, 390, 820 y 1440 px; rendimiento de kiosco a 1280×800 y 1920×1080. Los tests capturan evidencia con nombres de ruta, estado y pasada en `docs/evidence/stage2/`. **Generar capturas no sustituye mirarlas.**

| Pasada | Resultado real | Evidencia/bloqueo |
| --- | --- | --- |
| 1 · inspección crítica | Pendiente | `npm run dev`: `Error: spawn EPERM` en `next-dev.js:393:45`; `npm run test:e2e`: `Error: spawn EPERM` |
| Correcciones | Revisión de código únicamente | Controles ≥48 px, wrap/rejilla intrínseca, contraste de texto oscuro sobre papel/lima, SVG separado de datos privados, cleanup de respuestas tardías y errores accionables; sin aceptación visual |
| 2 · recarga de versión final | Pendiente | No hay runtime accesible iniciado en este entorno; el build también se bloquea al lanzar TypeScript |

El intento directo de lanzar el Chromium de Playwright encontró además el binario headless ausente bajo `.cache/playwright/` (`chromium_headless_shell-1254`). No se instaló un navegador ni se cambió `PLAYWRIGHT_BROWSERS_PATH` para eludir el entorno. El runner respeta un valor ya definido.

Para cerrar: en un entorno con subprocesos y Chromium, ejecutar los cinco comandos de validación, recorrer todas las rutas/estados y mirar las capturas de la primera pasada; corregir defectos del alcance, recargar, realizar y documentar la segunda pasada. Si una corrección posterior afecta un estado, revisarlo de nuevo. Registrar geometría, jerarquía, texto, teclado/foco, interacción, overflow, carga/error y reduced-motion. Una prueba de escritorio con CPU 4× no acredita rendimiento de Raspberry Pi real.

## Etapa 4B ? verificaci?n pendiente

Las nuevas interfaces requieren sus propias dos pasadas. [Registro identificado](evidence/stage4b/visual-review.md): CUA falla al iniciar con error de assets del kernel (os error 3); next dev no puede lanzar subprocesos. E2E y capturas est?n preparados; no se generaron/miraron im?genes de esta etapa ni se afirma 0 p?xeles. El revisor debe ejecutar, inspeccionar, corregir y recargar antes de aceptar.
