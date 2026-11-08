# Revisión visual · etapa 2

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
