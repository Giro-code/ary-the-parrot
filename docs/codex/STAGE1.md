# Codex — Etapa 1: estructura + landing preservada + regresión

Trabajas en `D:\Ary The Parrot` (repo git local, rama `main`, tag `baseline-static-ary`). El documento rector es `docs/ARY_PROMPT_MAESTRO.md` (léelo entero; en esta etapa aplican sobre todo 0A, 0B, 1, 3, 12, 13.7, 16). Los cinco archivos originales están en `legacy/` con `legacy/SHA256SUMS`. **No modifiques nada dentro de `legacy/`.** No hagas commits (los hace el revisor). No subas nada a ningún remoto. No hay claves reales: todo en modo prueba.

## Decisiones ya tomadas (no las cambies)

- Stack: **Next.js App Router (última versión estable, verifica con `npm view next version`) + TypeScript strict + npm**. Sin Tailwind ni librerías UI. Node instalado: v26.
- Dominio de producción: `arytheparrot.app`, solo vía variable `APP_BASE_URL` (en local `http://localhost:3000`). Nunca codificado en el código.
- BD futura: Neon Postgres (etapa 2). Correo: Resend (etapa 3, dry-run). IA: Gemini (etapa posterior, modo demo si no hay clave). Hardware: simulador.

## Tareas

1. Inicializa el proyecto Next.js en la raíz (no en subcarpeta) sin sobrescribir `legacy/`, `docs/`, `.gitignore` (amplíalo si hace falta).
2. **Landing pixel-conservativa**: sirve la web original en `/` como estático:
   - `public/index.html` derivado de `legacy/index.html`, con el `<style>` inline movido a `public/site/landing.css` y el `<script>` inline a `public/site/landing.js`, **sin cambiar el resultado visible ni el comportamiento** (router por hash `#inicio #conoce #historia #nosotros #brochure #solicitar`, `document.title`, menú móvil, pestañas `aria-selected`, demo `#demo-dialog` con sus tres intereses, `#presentation-dialog` con flechas y Escape, formulario con descarga `.txt`, skip link).
   - `next.config` con rewrite `beforeFiles` de `/` → `/index.html` para que `/#conoce` etc. sigan funcionando.
   - `public/assets/*.png` y `public/brochure.html` **byte-idénticos** a legacy (verifica con sha256 en un test).
   - Añade UNA entrada discreta, coherente con el diseño existente, hacia la nueva experiencia (`/kiosco` y `/experiencia`), p. ej. un enlace secundario en el hero. Documenta esta diferencia aceptada.
   - El formulario sigue igual en esta etapa (el envío real llega en la etapa 3).
3. `GET /api/health` real: `{ status, version, time, checks: { database: "not_configured" | ..., email: "dry_run" | ..., ai: "demo" | ..., robot: "simulator" } }` derivado de variables de entorno, sin exponer secretos. Cabeceras de seguridad globales razonables en `next.config` (CSP compatible con la landing actual: comprueba que no rompe nada; `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`).
4. Scripts npm: `dev`, `build`, `start`, `lint`, `typecheck`, `test` (Vitest), `test:e2e` (Playwright, Chromium; instala el navegador con `npx playwright install chromium`).
5. **Tests de regresión Playwright** que corran tanto contra la versión original (sirve `legacy/` con un servidor estático simple en otro puerto, configurado en `playwright.config` como segundo webServer) como contra la nueva app:
   - las seis vistas por hash y el cambio de `document.title`;
   - menú móvil (abrir/cerrar, Escape, foco), pestañas de escenarios con teclado y `aria-selected`;
   - demo: los tres botones cambian la respuesta; presentación: tres diapositivas, flechas, Escape;
   - descarga del `.txt` del formulario con validación;
   - `/brochure.html` carga y enlaza de vuelta;
   - sin errores de consola y sin scroll horizontal a 390, 820, 1440 y 1920 px;
   - comparación de capturas legacy vs nueva por vista y ancho (pixelmatch o `toHaveScreenshot` con la captura de legacy como referencia), con umbral bajo; guarda las capturas comparativas en `docs/screenshots/` (PNG optimizados, no gigantes).
   - test unitario Vitest: sha256 de assets y brochure iguales a `legacy/SHA256SUMS`; `/api/health` no filtra valores de variables.
6. `.env.example` según la sección 16 del prompt maestro (placeholders, `APP_BASE_URL=https://arytheparrot.app` como ejemplo de producción, `EMAIL_DRY_RUN=true`, flags de marketing/partner en `false`). Ningún secreto.
7. Documentos (en español, concisos y verificables):
   - `docs/BASE_AUDIT.md`: los cinco archivos, tamaños, sha256, funcionalidad exacta antes de cambios (incluye lo que el LEEME afirma vs lo que verificaste tú).
   - `docs/ARY_MIGRATION_DECISION.md`: por qué Next.js + landing estática servida tal cual (menor riesgo visual, unifica API/auth/Vercel), enlaces legacy preservados, estrategia del brochure (se mantiene tal cual, 4 MB, no se incrusta en JS).
   - `docs/LEGACY_REGRESSION.md`: elementos preservados, resultados de los tests con fecha, capturas, diferencias aceptadas.
   - `docs/ARY_IMPLEMENTATION_PLAN.md`: inventario `EXISTS / PARTIAL / MISSING / BLOCKED` y plan por etapas (1 estructura; 2 BD + sesión + kiosco + QR + móvil; 3 correo + consentimientos + B2B; 4 admin/partner/analítica/robot/docs), con casillas.

## Criterio de terminado

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `npm run test:e2e` pasan. Si algo falla y no puedes arreglarlo, déjalo documentado con el error exacto; no borres ni debilites tests para que pasen. Al terminar imprime: archivos creados/modificados, comandos ejecutados con su resultado, diferencias visuales detectadas y cualquier bloqueo.
