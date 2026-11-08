# Ary la Cotorra

Next.js 16, React y TypeScript. La web original y el brochure se conservan en `public/`; `legacy/` es la referencia de regresión. Las etapas 2/3 añaden sesión anónima, kiosco, QR privado, Mi viaje, recuperación opcional por correo verificado, privacidad y solicitudes B2B separadas. Explorar no requiere correo. No hay IA ni hardware conectado en esta etapa.

La etapa 3 usa **correo dry-run por defecto** y no envió correos reales durante su implementación. [Configuración de correo](docs/ARY_EMAIL_SETUP.md), [seguridad y privacidad](docs/ARY_SECURITY_AND_PRIVACY.md) y [cierre y bloqueos](docs/ARY_STAGE3_REPORT.md). No se hizo commit, push ni despliegue.

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

Rutas: `/kiosco`, `/experiencia`, `/mi-viaje`, `/privacidad`, `/reingresar`, `/cuenta/privacidad`, `/cultura/<id>` (ficha pública). El QR privado abre `/q/<token>`; el enlace de correo abre `/auth/verify?token=…`. Ambos requieren confirmación antes del canje. `/dev/outbox` muestra correos sintéticos locales y responde 404 en producción.

Para la demo de recuperación: guardar una ficha, pulsar «Guardar mi experiencia y recibir un enlace por correo», usar `@example.invalid`, aceptar la finalidad de recuperación y abrir el enlace desde `/dev/outbox` en otro contexto del navegador. Solo tras confirmar se crea/vincula la cuenta, se rota la cookie y se recupera Mi viaje. Marketing está desactivado; activarlo en una demo aislada muestra una casilla separada y exige un segundo opt-in. No hay campañas automáticas.

«Preparar solicitud» conserva el TXT y pide confirmación de tratamiento antes del POST comercial. El resultado muestra referencia/estado o error y reintento. Rechazar el tratamiento mantiene el camino de TXT local. El resultado y aviso nuevo solo aparecen tras preparar la solicitud; el HTML/CSS de la landing en reposo se conserva.

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

Migraciones: `drizzle/0000_ary_core.sql` y `drizzle/0001_stage3_email_privacy.sql`, con journal y snapshots. Ahora hay 26 tablas; las tres nuevas son `commercial_inquiries`, `email_suppressions` y `email_webhook_events`. `npm run db:generate` genera futuras migraciones. Los SQL de `drizzle/rollback/` son destructivos, exclusivos de BD vacías/de pruebas autorizadas, y no se ejecutan automáticamente. El rollback de etapa 3 se aplica antes del inicial.

Correo/privacidad requieren `AUTH_SECRET` y `SESSION_ENCRYPTION_KEY` de alta entropía en producción (mínimo 32 caracteres cada uno); sin ellas, 503. `EMAIL_DRY_RUN=true` y la ausencia de remitente/clave seleccionan siempre el adaptador local. `RESEND_WEBHOOK_SECRET`, `ADMIN_NOTIFICATION_EMAIL` y los demás placeholders están en `.env.example`. No imprimir secretos. El cron de `vercel.json` exige un plan compatible con frecuencia de un minuto; un cron diario no sirve para enlaces que caducan en 15 min. No está desplegado.

La limpieza manual también purga enlaces caducados, outbox/eventos webhook de 30 días, solicitudes comerciales de 180 días y cuentas con 365 días de inactividad. Los plazos son propuestas pendientes de revisión jurídica. La interfaz explica límites de backups y datos ya transmitidos. Ver privacidad para exportación/borrado de una cuenta verificada.

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

Estado y bloqueos de esta ejecución: [informe de etapa 3](docs/ARY_STAGE3_REPORT.md) y [FEATURE_MATRIX](docs/FEATURE_MATRIX.md). Amenazas y canje QR: [ARY_QR_HANDOFF](docs/ARY_QR_HANDOFF.md). Las dos pasadas visuales de **etapa 3** están pendientes por el bloqueo del acceso a navegador, documentado en [VISUAL_REVIEW](docs/VISUAL_REVIEW.md); la verificación anterior de etapa 2 se conserva como historial.
