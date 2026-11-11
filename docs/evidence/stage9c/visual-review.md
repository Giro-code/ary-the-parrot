# Etapa 9C — revisión visual pendiente

Fecha: 2026-11-11. Proyecto: `D:\Ary The Parrot`. Implementación local de búsqueda, respaldo y peticiones de fotos. Se conserva `AryChat → SourceCarousel → ItemPhoto / MapsLink`, sin cambios de diseño ni CSS.

## Entorno y evidencia observada

- `npx playwright test --project=stage9c --workers=1`, con `ARY_E2E_AI_FAILURE=1`: exit 1, `Error: spawn EPERM` antes de ejecutar casos.
- Inventario del navegador mediante `cua.getState()`: `apps: []`, `browsers: []`; `The browser access host is unavailable`.
- La superficie nativa también falla: `Computer Use native pipe is unavailable: failed to connect native pipe: The system cannot find the file specified. (os error 2)`.
- No se generaron ni observaron capturas de esta etapa. No se sustituyó la UI por un render estático ni se consultó producción.

## Pasada 1 — no ejecutada

Pendiente abrir `/experiencia` en 390×900 y 1440×900, con visitante sintético y proveedor simulado. Revisar la pregunta de zona colonial, el respaldo ante HTTP 500 para cuevas, las fotos por contexto y el carrusel de tres fichas. Inspeccionar textos, jerarquía, foto/crédito, foco, carga, controles deshabilitados, overflow, indicadores y diálogo con Esc. Revisar además `/kiosco`: fotos presentes y ausencia de enlaces externos/Maps.

## Pasada 2 — no ejecutada

Pendiente recargar la versión final y repetir los estados anteriores, además de `show me photos of Samaná`, tema desconocido y ficha sin foto. Corregir los defectos dentro del alcance y volver a inspeccionar los estados afectados. No hay hallazgos visuales que puedan declararse resueltos sin observar la interfaz.

## Casos preparados para el revisor

`tests/e2e/stage9c.spec.ts` contiene seis casos, incluidos dos recorridos de captura separados. El script de servidor E2E utiliza PGlite sintético, correo dry-run y un preload que devuelve HTTP 500 localmente para el host de IA. Las peticiones de fotos se resuelven por el servidor sin proveedor. El audio de reproducción se simula en el transporte.

PowerShell:

```powershell
$env:ARY_E2E_AI_FAILURE = '1'
npx playwright test --project=stage9c --workers=1
```

Las capturas previstas se identifican en [screenshots/stage9c/README](../../screenshots/stage9c/README.md). Ejecutar los tests y generar capturas no completa las pasadas: hay que abrirlas e inspeccionarlas. Ampliar después a 320 px y un ancho intermedio cuando el navegador esté disponible. La aceptación visual y la prueba en teléfono real siguen pendientes.
