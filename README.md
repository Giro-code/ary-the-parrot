# Ary la Cotorra

Next.js 16, React y TypeScript. La web original y el brochure se conservan en `public/`; `legacy/` es la referencia de regresión. La etapa 2 añade sesión anónima, contenido de demostración, kiosco, QR privado y Mi viaje. No requiere correo. No hay IA ni hardware conectado en esta etapa.

## Arranque local

Usar Node **26.2 o posterior compatible**: los scripts TypeScript se ejecutan con el soporte nativo de Node, sin transpilador externo. Desde la raíz:

```powershell
npm i
# En .env.local: APP_BASE_URL=http://127.0.0.1:3000
# Sin DATABASE_URL se usa .pglite/ exclusivamente fuera de producción.
npm run db:migrate
npm run db:seed
npm run kiosk:enroll -- --label "Demo kiosk"
npm run dev
```

Abrir la URL privada de activación impresa por `kiosk:enroll` **en el navegador del kiosco** y pulsar «Activar este kiosco». Caduca en diez minutos y solo se utiliza una vez. No copiarla en tickets o registros. Luego abrir `/kiosco`. Sin activación puede explorarse en modo demostración, sin generar QR privado.

Rutas: `/kiosco`, `/experiencia`, `/mi-viaje`, `/privacidad`, `/reingresar` (Próximamente), `/cultura/<id>` (ficha pública). El QR privado abre `/q/<token>` y requiere confirmación antes del canje.

Para un teléfono físico, `APP_BASE_URL` debe ser una dirección accesible desde ese teléfono, con el mismo origen que el kiosco. `127.0.0.1` solo sirve para simulación en el mismo ordenador. El comando dev se puede iniciar con `npm run dev -- --hostname 0.0.0.0` en una red de pruebas autorizada. No usar datos personales para la demo.

## Base de datos y configuración

- `DATABASE_URL`: Neon PostgreSQL; usa Pool WebSocket con transacciones interactivas. No se ha conectado una instancia real durante esta etapa.
- Sin `DATABASE_URL`: PGlite persistente en `.pglite/` en desarrollo; memoria en unitarias. En producción las APIs y health devuelven **503**, sin persistencia ficticia.
- `APP_BASE_URL`: origen canónico para QR y CSRF; HTTPS obligatorio en producción.
- `RATE_LIMIT_SALT`: secreto independiente y estable, obligatorio en producción (se admite `AUTH_SECRET` como respaldo). Nunca se muestra en respuestas.
- `VISITOR_SESSION_TTL_HOURS`: 24 por defecto, máximo 168; expiración fija sin renovación automática.
- `QR_HANDOFF_TTL_SECONDS`: 120 por defecto, máximo 300.
- `PGLITE_DATA_DIR`: solo local/pruebas. No abrir el mismo directorio desde dos procesos.
- `ANALYTICS_RETENTION_DAYS`: 90 por defecto, pendiente de validación jurídica.

`db:seed` verifica cada fuente por HTTP en cada ejecución. Crea 12 temas en ES/EN: solo publica los comprobados; las fuentes fallidas quedan `needs_source`. La evidencia se escribe en `docs/evidence/stage2/seed-sources.json`. No ejecutar el seed sobre producción sin revisar antes el contenido.

`npm run db:cleanup` elimina registros operativos caducados, tokens, ventanas de rate limit y eventos vencidos. Es una operación manual del operador: no existe cron desplegado. La interfaz distingue caducidad del acceso y borrado físico. Ejecutarlo con el servidor local detenido para PGlite.

Migración: `drizzle/0000_ary_core.sql`, con journal y snapshot de Drizzle. Las 23 tablas incluyen las previstas para etapas posteriores. `npm run db:generate` genera futuras migraciones. `drizzle/rollback/0000_ary_core.sql` es destructivo y solo está destinado a una BD vacía/de pruebas autorizada; no se ejecuta automáticamente.

Rotar un dispositivo: detener el servidor PGlite, ejecutar `npm run kiosk:enroll -- --label "Demo kiosk" --device <uuid>` y activar el enlace nuevo en el dispositivo. Al activarse se revoca la credencial anterior. La cookie de kiosco dura 30 días; el código de activación dura diez minutos.

## Validación

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run check:kiosk-budget
# Usar el PLAYWRIGHT_BROWSERS_PATH del entorno si ya está definido.
npx playwright install chromium
npm run test:e2e
```

Playwright usa tres servidores: original en 3001, build de producción sin BD en 3000 y una demo aislada con PGlite en 3002. No utiliza servicios de correo ni datos reales. El script de pruebas crea una BD nueva bajo `.cache/` y cierra su conexión antes de iniciar Next dev. Los casos de rendimiento usan CDP a CPU 4× y guardan cifras; no equivalen a una Raspberry Pi física. `check:kiosk-budget` mide gzip de los chunks de entrada del kiosco, incluido código compartido y excluido el bootstrap de Next.

Estado y bloqueos de esta ejecución: [FEATURE_MATRIX](docs/FEATURE_MATRIX.md). Amenazas y canje: [ARY_QR_HANDOFF](docs/ARY_QR_HANDOFF.md). La revisión visual tiene **dos pasadas pendientes** por el bloqueo del runtime, documentadas en [VISUAL_REVIEW](docs/VISUAL_REVIEW.md).
