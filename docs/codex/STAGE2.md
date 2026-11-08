# Codex — Etapa 2: BD + sesión anónima + kiosco + QR seguro + móvil + Mi viaje

Sigues en `D:\Ary The Parrot`. La etapa 1 (Next.js + landing preservada + regresión) ya está hecha y commiteada; léela en `docs/ARY_IMPLEMENTATION_PLAN.md` y `docs/ARY_MIGRATION_DECISION.md`. Documento rector: `docs/ARY_PROMPT_MAESTRO.md` (aplican sobre todo 0C, 0D, 2 Flujo A y C, 3, 4, 5, 6, 7, 11, 12, 13). **No toques `legacy/`, ni `public/index.html`, ni `public/brochure.html`, ni `public/assets/`.** No hagas commits ni push. Los tests de regresión de la etapa 1 deben seguir pasando.

## Decisiones fijadas

- **ORM / migraciones:** Drizzle ORM + drizzle-kit, migraciones SQL versionadas en `drizzle/`. Revisa las versiones actuales con `npm view`.
- **Driver de base de datos:**
  - Si `DATABASE_URL` está definido: Neon (`@neondatabase/serverless`). Las transacciones del canje del QR deben funcionar de verdad; usa un driver/pool que las soporte.
  - Si **no** hay `DATABASE_URL` y `NODE_ENV !== "production"`: PGlite (`@electric-sql/pglite`) en `.pglite/` (dev) o en memoria (tests), con las mismas migraciones.
  - Si **no** hay `DATABASE_URL` en producción: los endpoints responden `503 { error: "database_not_configured" }`, nunca éxito falso, y `/api/health` lo refleja.
- **Esquema:** crea ya todas las tablas conceptuales de la sección 4 del prompt maestro, para que las etapas 3 y 4 solo las usen. Añade también:
  - `rate_limits`: rate limit persistente, válido en serverless.
  - `cultural_bridges`: país ↔ ficha, relación, fuente.

  Incluye índices, FK, uniques e IDs aleatorios no secuenciales.
- **i18n:** español e inglés con diccionarios centralizados (`src/i18n/`); sin traducir nombres propios.
- **Estilo:** reutiliza las variables de color de la landing (`--paper`, `--ink`, `--green`, `--lime`, `--coral`, `--line`) en un CSS de app propio. Botones táctiles ≥ 48 px, contraste AA, `prefers-reduced-motion`. Páginas privadas con `noindex`.

## Sesiones y seguridad

- **Cookie de visitante `ary_sid`:**
  - Valor opaco de 256 bits generado con CSPRNG; en la BD solo se guarda su hash SHA-256.
  - Flags: `HttpOnly`, `SameSite=Lax`, `Secure` en producción, `Path=/`.
  - Caduca según `VISITOR_SESSION_TTL_HOURS`. Nada secreto en `localStorage`.
- **CSRF:** en toda petición mutante, verifica `Origin`/`Host` contra `APP_BASE_URL` (o el host local en desarrollo) y exige el header `X-Ary-Request: 1`.
- **Kiosco autorizado:**
  - El script `npm run kiosk:enroll -- --label "Demo kiosk"` crea un `kiosk_devices` y una URL de activación de un solo uso: `/kiosco/activar?code=…`, con el código guardado como hash y caducidad de 10 min.
  - Al activarse, el navegador del kiosco recibe la cookie HttpOnly `ary_kiosk` (credencial rotable, guardada como hash).
  - Sin esa cookie, `/kiosco` funciona en "modo demostración sin dispositivo", rotulado, y **no puede generar QR de handoff**.
  - Documenta el procedimiento.
- **Datos guardados:** no guardes la IP en bruto (si hace falta para rate limit, guarda un hash con sal). No metas tokens en logs.

## Contenido cultural semilla

- Crea un seed `npm run db:seed` **marcado como contenido de demostración** (`status: "published"`, `demo: true`, `sourceCheckedAt`), con 10–14 fichas dominicanas en `es` y `en`. Ejemplos:
  - Ciudad Colonial de Santo Domingo (UNESCO).
  - Merengue, bachata, Teatro Cocolo Danzante y Cofradía del Espíritu Santo de los Congos de Villa Mella: patrimonio inmaterial de la UNESCO.
  - Mangú y gastronomía.
  - Larimar y ámbar.
  - Parque Nacional Los Haitises.
  - Ballenas jorobadas de Samaná.
  - Carnaval de La Vega.
  - Altos de Chavón.
- **Fuentes:** cada ficha lleva `sourceUrl` y `license`/editor. **Solo usa URLs que hayas comprobado en esta ejecución con una petición HTTP** (status 200 o redirección válida). Si no puedes verificar una, deja `sourceUrl = null`, `status = "needs_source"` y no la publiques. Nada de horarios, precios ni requisitos migratorios.
- **Puentes culturales** (`cultural_bridges`): pocos, factuales y con fuente (por ejemplo, la bachata o el merengue declarados por la UNESCO, o la herencia de las islas anglófonas del Caribe en los Guloyas/Cocolos). Si no hay puente verificado para un país, no lo inventes: muestra conexiones por intereses.
- **Prohibido inferir gustos por nacionalidad.**

## Recomendador (determinista, rotulado)

- `POST /api/recommendations`: puntúa las fichas por coincidencia con los intereses declarados (historia, música, gastronomía, naturaleza, arte, aventura) y el idioma.
- Cada recomendación devuelve:
  - `rationale`, por ejemplo «Te lo recomendamos porque seleccionaste música».
  - `evidenceIds`, `sourceUrl` y fecha de revisión.
- La respuesta lleva `mode: "rules"`, y la UI la muestra como «Recomendación por reglas · contenido de demostración».
- Guarda la fila en `recommendations`.
- Las preguntas sugeridas en el kiosco responden con texto de la propia ficha, rotulado como «Respuestas de ejemplo». La IA llega en otra etapa.

## API (validación con Zod, errores estructurados `{ error, message, requestId }`)

Implementa de la sección 5:

- Sesión y preferencias:
  - `POST /api/visitor/session`
  - `PATCH /api/visitor/preferences`
  - `GET /api/visitor/me`
- QR de handoff:
  - `POST /api/visitor/handoff`: requiere `ary_kiosk` + sesión.
  - `POST /api/visitor/handoff/redeem`
  - `POST /api/visitor/handoff/cancel`
  - `GET /api/visitor/handoff/status`: el kiosco lo consulta por polling corto.
- Contenido y recomendaciones:
  - `GET /api/cultural/items`
  - `GET /api/cultural/items/:id`
  - `POST /api/recommendations`
- Guardados: `GET /api/saved`, `POST /api/saved` y `PATCH /api/saved/:id` (estados `saved` / `visited` / `removed`, solo el propietario).

Registra en `analytics_events` (con lista blanca de metadatos y sin PII): `session_started`, `preferences_set` (solo categorías), `recommendation_shown`, `qr_generated`, `qr_redeemed`, `qr_expired`, `item_saved`.

## QR de handoff (sección 7, obligatoria)

- **Token:** 32 bytes CSPRNG en base64url; en la BD solo el hash. TTL `QR_HANDOFF_TTL_SECONDS` (por defecto 120). Un solo uso. `attemptCount` y rate limit por token y por cliente.
- **Imagen:** QR en SVG generado en servidor (librería `qrcode`), apuntando a `${APP_BASE_URL}/q/<token>`. El QR no contiene PII, preferencias ni id de sesión.
- **Página `/q/[token]`:**
  - Solo muestra qué se recuperará (idioma, intereses, guardados) y un **código de confirmación de 2 dígitos**, que el kiosco muestra también («Comprueba que el kiosco muestra 47»).
  - Botón «Continuar mi experiencia» → `POST` de canje con el token en el body; el GET no cambia nada de estado.
  - Cabeceras `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `noindex`.
  - Tras el canje, redirige a `/experiencia` sin el token en la URL.
- **Canje:** atómico, en una sola sentencia condicional dentro de una transacción (`UPDATE … WHERE used_at IS NULL AND invalidated_at IS NULL AND expires_at > now() RETURNING`). Luego:
  - Crea una **sesión móvil nueva** con su propia cookie y copia preferencias y guardados.
  - Marca la sesión del kiosco como `transferred` y borra sus datos operativos.
- **Kiosco:** al detectar el canje (o caducidad o cancelación), muestra «Listo, sigue en tu teléfono» y vuelve a `idle` limpio en pocos segundos. Además vuelve a `idle` por inactividad (90 s, con aviso previo) y tiene botón «Terminar sin continuar».
- **UX:**
  - QR caducado → mensaje claro y «Pide un código nuevo en el kiosco».
  - QR ya usado → mensaje sin revelar datos.
  - Token alterado → mismo error genérico.

## Pantallas

- **`/kiosco`:** pantalla grande táctil (Raspberry Pi). Estados `idle` → `welcome` (ES/EN) → preferencias opcionales (país en un select con opción «Prefiero no decirlo», intereses como chips, «Omitir») → recomendaciones (tarjetas con fuente) → `handoff_qr` (QR + caducidad visible + código de 2 dígitos + aviso breve de privacidad + reiniciar) → `transferred` → `idle`.
  - Indicador `offline` real (`navigator.onLine` + `/api/health`).
  - Mascota: usa `/assets/ary-la-cotorra.png`.
  - Estado del robot: «Simulador» (no finjas hardware).
- **`/experiencia`** (móvil): saludo en el idioma restaurado, intereses editables, recomendaciones, guardar ficha y aviso de caducidad de la sesión anónima. Incluye un CTA separado «Guardar mi experiencia y recibir un enlace por correo», que en esta etapa solo lleva a `/reingresar` con el mensaje «Próximamente» honesto (la etapa 3 lo implementa).
- **`/mi-viaje`:** guardados con estados (`pendiente` / `realizado` / `favorito` / quitar), progreso y fichas compartibles (QR público de la ficha, distinto del QR de handoff).
- **`/privacidad`:** aviso breve en ES/EN que explica qué se guarda, cuánto tiempo y que no hay marketing ni cesión a proveedores por defecto. Marca qué partes requieren revisión jurídica.

## Raspberry Pi 4 (requisito del kiosco)

`/kiosco` correrá en Chromium a pantalla completa en una Raspberry Pi 4 (2–4 GB). La app sigue en Vercel; la Pi solo es el navegador y, más adelante, un servicio local de hardware.

- **Peso:** presupuesto de JS del kiosco pequeño, del orden de ≤ 200 KB gzip propios.
- **Sin cargas innecesarias:** sin librerías pesadas en cliente y sin cargar `brochure.html` ni imágenes grandes. Usa `/assets/ary-la-cotorra.png` con `next/image` en un tamaño adecuado.
- **Animaciones:** solo CSS con `transform`/`opacity` y desactivables.
- **Pantalla:** sin hover obligatorio y con objetivos táctiles grandes.
- **Prueba de rendimiento:** añade un test Playwright que mida la carga y la interacción de `/kiosco` con `CPU throttling 4x` (CDP `Emulation.setCPUThrottlingRate`) a 1280×800 y 1920×1080. Que `welcome` → recomendaciones responda en tiempos razonables; registra las cifras en `docs/FEATURE_MATRIX.md`.

## Tests (sin emails ni datos reales)

- **Vitest + PGlite en memoria:**
  - repositorios;
  - hash de tokens;
  - canje válido una sola vez;
  - **dos canjes concurrentes → solo uno gana** (`Promise.all`);
  - QR caducado (inyecta un reloj o un TTL corto);
  - token alterado;
  - límite de intentos;
  - un usuario no puede leer los guardados de otro;
  - el recomendador no usa el país para puntuar intereses;
  - en producción sin BD → 503.
- **Playwright** (criterios 1, 2 y 5 de 0C, y los casos de la sección 7):
  - Contexto A (kiosco activado con el script, en español) elige país e interés, ve el contenido y genera el QR.
  - Contexto B (móvil, 390 px) abre `/q/<token>`, confirma y ve exactamente sus selecciones.
  - El kiosco queda limpio en `idle`.
  - Contexto C reutiliza el mismo enlace → error.
  - QR caducado → UX de caducidad.
  - Visitante sin correo completa la experiencia.
  - Navegación por teclado básica en `/kiosco` y `/experiencia`.

## Docs

- Crea `docs/ARY_QR_HANDOFF.md`: amenazas, expiración, canje, confirmación por código, pruebas de concurrencia y límites conocidos.
- Actualiza `docs/ARY_IMPLEMENTATION_PLAN.md` y crea `docs/FEATURE_MATRIX.md` con el estado de cada función: `ORIGINAL` / `REAL_IMPLEMENTED` / `SANDBOX_ONLY` / `BLOCKED` / `NOT_DONE`, más la evidencia.
- Añade al README cómo arrancar en local: `npm i`, `npm run db:migrate`, `npm run db:seed`, `npm run kiosk:enroll`, `npm run dev`.

## Criterio de terminado

`lint`, `typecheck`, `test`, `build` y `test:e2e` pasan (incluida la regresión de la etapa 1). Si algo queda bloqueado, documenta el error exacto. Al terminar, imprime: archivos, migraciones, comandos con su resultado, URLs verificadas para el seed y bloqueos.
