# Etapa 10B — registro de verificación visual pendiente

Fecha: 2026-11-11. Artefacto: cambios locales descritos en `docs/ARY_STAGE10B_REPORT.md`. Runtime previsto: Next dev con PGlite aislado del script E2E y servicios de voz simulados.

## Intentos y evidencia

- `npm run test:e2e -- --project=stage10b`: `Error: spawn EPERM`, antes de ejecutar casos.
- `node scripts/e2e-server.ts`: prepara el fixture aislado; Next dev falla al hacer `fork` en `node_modules/next/dist/cli/next-dev.js:393`, errno -4048, syscall spawn.
- `npm run build`: compila con Turbopack y falla al lanzar la comprobación TypeScript por `spawn EPERM`.

No hay navegador local con esta versión de la aplicación iniciado por estos comandos. No se atribuye a una captura, a SSR o a una revisión de código el valor de una inspección visual real.

## Pasadas

| Pasada | Estado | Rutas y estados pendientes |
| --- | --- | --- |
| 1: inspección crítica | BLOQUEADA | `/experiencia` tarjeta de Bahía de las Águilas, galería de El Limón y lightbox; `/admin/catalogo` filtros, resultados, ocultación y vacío/error |
| 2: recarga y versión final | BLOQUEADA | Repetir escritorio/móvil ES/EN, teclado/foco, créditos, mapas y recorrido de ocultar/mostrar tras corregir hallazgos reales |

Viewports solicitados: 390×900 y 1440×900, ES/EN. El panel conserva su shell en español y títulos bilingües. Las pruebas tienen dos recorridos con recarga y nombres de archivos separados; escribirlos no equivale a ejecutarlos o mirar las capturas.

## Revisión de código y correcciones técnicas

- Créditos y licencias preservados, incluidas URL sin slash final, versiones 2.5 y licencias territoriales con `deed.en`.
- Visor con Esc, flechas, botones anterior/siguiente, foco atrapado y restauración del foco al cerrar; foto principal vuelve a la primera imagen al abrir.
- Filtros adaptables, nombres largos con wrapping, controles deshabilitados al cargar/guardar, error con reintento y estado vacío.
- No se fabricaron defectos visuales. Estas observaciones son de implementación y pruebas unitarias, no hallazgos vistos en navegador.

## Límite de los datos

El catálogo protegido tiene una foto por ficha, también Salto El Limón. No es posible fotografiar una galería real de varias imágenes con esos datos. El test de navegación múltiple usa un fixture sintético declarado que repite un asset y cambia su alt; nunca debe presentarse como contenido cultural adicional ni aceptación editorial.

Para cerrar la verificación se necesitan ejecutar los casos en un entorno que permita los subprocesos, abrir y mirar las capturas de la primera pasada, corregir lo observado y volver a ejecutar/inspeccionar la versión final. No se solicita ninguna ampliación de permisos ni se han intentado eludir las restricciones del entorno.
