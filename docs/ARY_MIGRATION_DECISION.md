# Decisión de migración de Ary

Fecha 7 de noviembre de 2026. Alcance de `docs/codex/STAGE1.md`.

## Arquitectura elegida

Next.js App Router 16.4.5, React 19.3.1, TypeScript strict y npm en la raíz. Las versiones estables se consultaron con `npm view next version` y `npm view react version`. Se usa Node 26.2.0. La inicialización manual conservó `docs/`, `.gitignore`, Git y todos los originales.

La landing continúa como HTML estático. Su CSS y JS se extrajeron literalmente a `public/site/landing.css` y `public/site/landing.js`. Un test reconstruye la transformación completa y detecta cambios adicionales. La aplicación App Router aloja health y las futuras superficies de producto. Esta separación reduce el riesgo visual mientras reúne API, futura autenticación y despliegue Vercel en un proyecto.

El rewrite `beforeFiles` sirve `/index.html` al solicitar `/` y mantiene la dirección pública. Los fragmentos permanecen en el navegador. El orden está documentado en la referencia oficial de Next.js. [Rewrites de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)

## Continuidad pública

| Dirección | Tratamiento |
| --- | --- |
| `/` y `/index.html` | Mismo HTML estático de presentación |
| `/#inicio`, `/#conoce`, `/#historia`, `/#nosotros`, `/#brochure`, `/#solicitar` | Router y títulos originales |
| `/assets/ary-la-cotorra.png` y `/assets/don-rafael-prototipo.png` | Copias byte-idénticas |
| `/brochure.html` | Copia byte-idéntica y regreso histórico `index.html#brochure` |
| `/experiencia` y `/kiosco` | Avisos de disponibilidad en etapa 2 y enlaces de retorno |
| `/api/health` | Endpoint dinámico real de estado de configuración, sin caché |
| `/favicon.ico` | Rewrite al símbolo original de Ary extraído como `/site/favicon.svg` |

La única adición al contenido de la landing es un enlace secundario en el hero, `Explorar Ary · kiosco y móvil`, hacia `/experiencia`. Desde allí se enlaza `/kiosco`. Se eligieron avisos informativos para esas dos rutas durante esta etapa. Sus funciones interactivas corresponden a la etapa 2.

## Brochure y rendimiento

El brochure conserva sus 4.017.913 bytes, imágenes embebidas y estilos de impresión. Se carga como documento independiente al abrir su enlace. Su contenido permanece fuera del JavaScript de la aplicación. Los dos PNG originales mantienen nombre, ruta y bytes. No se incorporan fuentes remotas, Tailwind ni librerías UI.

## Configuración y seguridad

`APP_BASE_URL` será la única fuente de URL absoluta para los futuros enlaces de producto. Ninguna ruta de aplicación codifica el dominio de producción. `.env.example` muestra `https://arytheparrot.app` y documenta `http://localhost:3000` para desarrollo. En esta etapa la navegación usa enlaces relativos y health no devuelve la URL ni valores de configuración.

Health informa disponibilidad del proceso y presencia de configuración. `configured_unverified` indica que existen los parámetros mínimos. No se consulta ningún proveedor. Sin configuración, BD devuelve `not_configured`, correo `dry_run`, IA `demo` y robot `simulator`. El simulador es el único modo de robot implementado, aunque una variable solicite hardware. Marketing y partner sharing quedan desactivados en el ejemplo.

Las cabeceras globales incluyen CSP con recursos propios, imágenes `data:`/`blob:`, bloqueo de objetos y de framing, `nosniff`, política de referrer y permisos de cámara/micrófono/geolocalización desactivados. La CSP permite estilos inline y scripts inline por compatibilidad con el brochure original y el bootstrap de Next.js. `unsafe-eval` se habilita exclusivamente en desarrollo. La ejecución de handlers del brochure y los diálogos tiene tests, con verificación en navegador pendiente. [Cabeceras de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)

## Herramientas y restricción del entorno

Vitest usa cargador nativo y pool de hilos. Next.js usa `experimental.workerThreads=true` y `experimental.useTypeScriptCli=false` para comprobar tipos mediante la API de TypeScript en un hilo. Se mantienen la comprobación de tipos del build y `tsc --noEmit`. Estas opciones de Next.js son experimentales y se eligieron para que el build completo pueda funcionar en este entorno, que rechaza subprocesos con IPC/pipes mediante `spawn EPERM`.

Playwright conserva su ejecución Chromium normal y sus dos `webServer`. Prueba la aplicación de producción con `npm run start` y el original con el servidor estático local. Su runner y la instalación de Chromium requieren subprocesos que este entorno bloquea. [Servidores de pruebas de Playwright](https://playwright.dev/docs/test-webserver)

## Reproducción local

Desde la raíz, en PowerShell y con capacidad de crear subprocesos

```powershell
npm ci
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'
npx playwright install chromium
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run dev` usa el puerto 3000. `npm run start` sirve el build de producción. Playwright inicia y cierra sus dos servidores, de modo que ambos puertos deben estar libres. La caché de npm y los navegadores se ubican en `.cache/`, fuera del seguimiento de Git. El estado de validación y las restricciones actuales se registran en `LEGACY_REGRESSION.md`.
