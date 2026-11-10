# Regla vigente desde etapa 8

El propietario autorizó el rediseño cultural de la landing ES/EN, CSS, JS y brochures. La igualdad de píxeles frente a legacy ya no es un criterio de aceptación. El contenido que sigue es evidencia histórica de etapas anteriores.

`legacy/` permanece intacto: sus hashes originales siguen comprobándose en Vitest. También se conservan los assets originales y el brochure enlazado. `tests/e2e/legacy-regression.spec.ts` ahora comprueba navegación, foco, menú móvil, accesibilidad básica, demo, presentación, TXT/B2B, enlaces, créditos y ausencia de overflow en la nueva landing; no compara píxeles. La etapa 7 conserva idioma automático y sus interacciones; se retira su comparación visual anterior.

Playwright usa los servidores 3000 (build sin BD) y 3002 (demo aislada) sin necesitar el servidor de legacy. La etapa 7 ya estaba integrada; no existía `playwright.stage7.config.ts` al iniciar esta tarea. Se añaden proyectos stage8/Chromium y stage8-webkit, sin conflictos de puertos. Se respeta el directorio de navegadores elegido por el entorno o el predeterminado de Playwright.

**Esta ejecución no acredita E2E ni revisión visual:** procesos bloqueados con `spawn EPERM` y host del navegador inaccesible. Ver [informe de etapa 8](ARY_STAGE8_REPORT.md) y [pendiente visual](evidence/stage8/visual-review.md).

---

# Regresión de la landing de Ary

Fecha local 7 de noviembre de 2026, America/La_Paz. Base `b04db41`. Evidencia HTTP final a `2026-11-08T00:00:33.533Z`, todavía 7 de noviembre en La Paz.

## Resultado

**Verificación del revisor (7 nov 2026, fuera del sandbox de Codex):** `lint`, `typecheck`, `test` (16), `build` y `test:e2e` pasan. Resultado E2E: **65 passed, 1 skipped** (la prueba de API/rutas nuevas se omite a propósito en el proyecto `legacy`). La comparación visual legacy vs app da **0 píxeles distintos** en las 6 vistas × 4 anchos (390/820/1440/1920), excluyendo solo `.experience-entry` en inicio. Resumen: `docs/screenshots/comparison-summary.json`; las PNG completas se regeneran con `npm run test:e2e` y no se versionan (≈30 MB).

Ajustes del revisor a la suite (errores de la prueba, no de la migración):
- El título esperado se calcula con `textContent`, igual que el JS original. `<h1>` con `<br>` produce p. ej. «Dale voz a las ganasde descubrir. · Ary»: es un detalle heredado del original, conservado tal cual.
- La espera de imágenes ignora las `loading="lazy"` de secciones ocultas (nunca cargan) y tiene un tope de 5 s.
- Las capturas congelan transiciones y ocultan el skip link (solo visible con foco; tiene su propia prueba) en ambas versiones por igual.
- Presentación: en el original, al deshabilitarse «siguiente» en 3/3 el foco sale del diálogo y las flechas dejan de responder hasta devolver el foco. Comportamiento heredado; la prueba devuelve el foco como haría un usuario con Tab.
- Se retiraron las opciones experimentales de Next.js (`workerThreads`, `useTypeScriptCli`): solo eran un rodeo al sandbox; el build pasa sin ellas.

Las secciones siguientes son el informe original de Codex, con los bloqueos de su sandbox (`spawn EPERM`), ya resueltos por la verificación anterior.

| Comprobación final | Resultado | Evidencia |
| --- | --- | --- |
| `npm run lint` | PASS | Sin errores ni warnings |
| `npm run typecheck` | PASS | `tsc --noEmit`, strict activo |
| `npm test` | PASS | 16 tests en tres archivos |
| `npm run build` | PASS | Compilación, validación TypeScript y prerender completos |
| `npm run test:e2e` | BLOCKED | `Error: spawn EPERM` antes de ejecutar tests |
| `npx playwright test --list` | PASS | 66 casos descubiertos en dos proyectos |
| `npx playwright install chromium` | BLOCKED | Fallo al crear el subproceso de descarga |
| `npm run start` | PASS | Servidor de producción en `127.0.0.1:3000` |
| Comprobación HTTP directa | PASS | Nueve rutas/recursos 200, cabeceras y tres copias byte-idénticas |
| `npm audit` | PASS | Cero vulnerabilidades tras corregir dependencia de desarrollo |
| `git diff --check` | PASS | Sin errores de whitespace en cambios seguidos |

Las unitarias verifican los cinco hashes originales, tres copias públicas, extracción literal de HTML/CSS/JS, estados y ausencia de filtración en health, rewrites, cabeceras, símbolo original del favicon y configuración segura de ejemplo.

## Elementos preservados

| Elemento | Evidencia actual |
| --- | --- |
| Seis vistas, títulos, history, textos y hash | Código original literal, tests E2E preparados |
| Menú, foco, Escape y skip link | Código original literal, tests de teclado preparados |
| Escenarios y estados ARIA | Código original literal, tests preparados |
| Tres intereses y respuestas de demo | Código original literal, tests preparados |
| Presentación de tres diapositivas y límites | Código original literal, tests preparados |
| Validación y descarga TXT | Código original literal, test del contenido descargado preparado |
| Brochure e impresión | Hash y bytes HTTP iguales, test de impresión y regreso preparado |
| PNG originales | Hash y bytes HTTP iguales |
| CSS y JS | Igualdad literal completa comprobada con Vitest |
| Overflow, consola y violaciones CSP | Ejecución en navegador pendiente |

## Diferencias aceptadas

La diferencia intencional dentro de la landing es una sola entrada secundaria en el hero, `Explorar Ary · kiosco y móvil`, hacia `/experiencia`. Se eligieron avisos informativos de etapa 2 en `/experiencia` y `/kiosco`, enlazados entre sí y con la web. Sus funciones interactivas quedan para la etapa 2. La comparación visual aún no ha determinado diferencias de píxeles.

Se añadió respuesta a `/favicon.ico` mediante rewrite al símbolo SVG original de Ary extraído literalmente. Un primer handler devolvía 500 por serialización de una respuesta 204 durante prerender. Se sustituyó por ese recurso estático. La petición final devuelve 200 `image/svg+xml`. Los cinco originales permanecen intactos.

## Suite de navegador preparada

Los dos `webServer` inician Next.js de producción en 3000 y `legacy/` en 3001. Ambos proyectos usan Chromium. Las pruebas de interfaz cubren ambas versiones. La prueba específica de API y rutas nuevas corresponde al proyecto `app`.

- Seis vistas por cuatro anchos, 390, 820, 1440 y 1920 px, con título, sección activa y ancho de documento.
- Router, back/forward, hash desconocido y foco de `main`.
- Menú móvil, apertura, cierre, Escape sobre el botón, tabulación y foco tras navegar.
- Skip link mediante teclado.
- Escenarios con click, flechas, Home y End, ARIA, foco, contenido y tabIndex.
- Tres respuestas de demo, escenas SVG, botones seleccionados y foco restaurado.
- Tres diapositivas, extremos deshabilitados, flechas, Escape y foco restaurado.
- Formulario vacío, email inválido, espacios, descarga TXT, contenido y edición posterior.
- Brochure, imágenes, handler de impresión, media print y regreso.
- Fixture común que recoge errores de consola, página y violaciones CSP.
- API, cabeceras de producción, recursos y navegación de los avisos de etapa 2.

La comparación usa una referencia viva de legacy, `pixelmatch` con sensibilidad 0,1 y fracción máxima de diferencias de 0,001. Primero se guarda la captura nueva completa. Solo para comparar inicio se retira el elemento exacto `.experience-entry`, la única adición autorizada al contenido. Las otras vistas se comparan completas. Se exigen dimensiones iguales y se guardan métricas y diff. Las referencias no se actualizan automáticamente para tolerar regresiones.

## Capturas y dos pasadas visuales

`docs/screenshots/README.md` describe las salidas previstas de la suite. Aún no hay PNG comparativos ni imágenes propias de aceptación visual.

| Pasada | Estado | Motivo |
| --- | --- | --- |
| Primera inspección crítica de escritorio y móvil | BLOCKED | Host de navegador no disponible y Edge denegado |
| Segunda inspección final tras recarga | BLOCKED | Acceso a navegador pendiente |

Se preparó `visual-review-loop` y se intentó abrir un navegador. No se llegó a ver la interfaz. La revisión de código y HTTP no sustituyen esas dos pasadas. Errores exactos recibidos

```text
Browsers: Error: The browser access host is unavailable
Computer Use was not approved to use Microsoft Edge
```

## Errores de entorno y correcciones

La primera consulta npm no pudo escribir en su caché global. `.npmrc` la sitúa dentro del proyecto y las consultas e instalaciones posteriores funcionan.

```text
EPERM: operation not permitted, open 'C:\Users\Atlas\AppData\Local\npm-cache\_cacache\tmp\***'
```

Vitest con el cargador por defecto falló al crear un subproceso desde Vite. El cargador nativo y el pool de hilos permiten ejecutar las 16 pruebas sin desactivar comprobaciones.

```text
failed to load config from D:\Ary The Parrot\vitest.config.ts
[plugin externalize-deps]
Error: spawn EPERM
at optimizeSafeRealPathSync
```

El build inicial compilaba y fallaba al comenzar TypeScript. Se activaron workers de hilos y la comprobación mediante API de TypeScript de Next.js. El build completo pasa. Ambas opciones son experimentales y mantienen la validación de tipos.

```text
Creating an optimized production build ...
Compiled successfully
Running TypeScript ...
spawn EPERM
```

La instalación Chromium se intentó con `.cache/playwright`, tanto con salida normal como en terminal. Sigue bloqueada antes de completar la descarga.

```text
Downloading Chrome for Testing 158.0.8127.18 (playwright chromium v1254)
Failed to install browsers
Error: Failed to download Chrome for Testing 158.0.8127.18 (playwright chromium v1254), caused by
Error: spawn EPERM
at downloadBrowserWithProgressBarOutOfProcess
```

El descubrimiento de 66 casos funciona. El runner E2E falla antes de ejecutarlos.

```text
> ary-la-cotorra@0.1.0 test:e2e
> playwright test

Error: spawn EPERM
```

`npm run dev` conserva el comando convencional y encuentra la misma restricción en el fork de Next.js. El servidor de producción sí arrancó.

```text
Error: spawn EPERM
at D:\Ary The Parrot\node_modules\next\dist\cli\next-dev.js:393:45
errno: -4048
code: 'EPERM'
syscall: 'spawn'
```

Un comando compuesto de arranque con asignaciones de variables fue rechazado automáticamente con `rejected: blocked by policy`. El comando reducido `npm run start` se autorizó y funcionó.

## Dependencias

La auditoría inicial encontró ocho avisos moderados derivados de `minimatch@10.2.6` en herramientas TypeScript de ESLint. `npm audit fix` conservador no los resolvió. Se añadió un override limitado a `@typescript-eslint/typescript-estree` con `minimatch@11.0.5`. La instalación final informa cero vulnerabilidades y se repitieron las validaciones. La corrección publicada comienza en 11.0.1. [Advisory de minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249)

## Evidencia HTTP de producción local

Nueve solicitudes devolvieron 200 y las cabeceras esperadas, portada, ambos HTML, CSS, JS, health, ambas rutas nuevas y favicon. El HTML recibido en `/` coincide literalmente con `public/index.html`. Los bytes HTTP de ambos PNG y brochure coinciden con los originales. Health respondió con versión `0.1.0`, hora ISO actual y checks `not_configured`, `dry_run`, `demo` y `simulator`. Se comprobó `Cache-Control: no-store` y ausencia de `X-Powered-By`.

## Archivos creados o modificados

Modificado, `.gitignore`, ampliado con cachés locales y `*.tsbuildinfo`.

| Grupo | Archivos creados |
| --- | --- |
| npm y TypeScript | `.npmrc`, `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts` |
| Next y lint | `next.config.ts`, `eslint.config.mjs` |
| Entorno | `.env.example` |
| App Router | `app/layout.tsx`, `app/globals.css`, `app/api/health/route.ts`, `app/experiencia/page.tsx`, `app/kiosco/page.tsx` |
| Landing y estáticos | `public/index.html`, `public/site/landing.css`, `public/site/landing.js`, `public/site/favicon.svg`, `public/brochure.html`, `public/assets/ary-la-cotorra.png`, `public/assets/don-rafael-prototipo.png` |
| Herramientas de pruebas | `vitest.config.ts`, `playwright.config.ts`, `scripts/legacy-server.mjs` |
| Tests | `tests/unit/legacy.test.ts`, `tests/unit/health.test.ts`, `tests/unit/config.test.ts`, `tests/e2e/legacy-regression.spec.ts` |
| Documentación | `docs/BASE_AUDIT.md`, `docs/ARY_MIGRATION_DECISION.md`, `docs/LEGACY_REGRESSION.md`, `docs/ARY_IMPLEMENTATION_PLAN.md`, `docs/screenshots/README.md` |

El prompt maestro y los documentos originales de `docs/codex/` permanecen intactos. La etapa 1 no incluye migraciones de BD. Los servicios locales propios se detuvieron tras las comprobaciones.

Durante la ejecución apareció un `.env.local` (creado por el usuario con su clave de Gemini). Permanece ignorado por Git y solo se inspeccionaron nombres de variables. La etapa 1 conserva la IA en modo demo; Gemini es el proveedor elegido por el usuario y se integrará en una etapa posterior.
