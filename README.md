# Ary la Cotorra

Next.js 16, React y TypeScript. La web original y el brochure se conservan en `public/`; `legacy/` es la referencia de regresión. Las etapas 2/3 añaden sesión anónima, kiosco, QR privado, Mi viaje, recuperación opcional por correo verificado, privacidad y solicitudes B2B separadas. Explorar no requiere correo. La etapa 4A añade chat cultural fundamentado con Gemini y fallback de ejemplo, simulador y puente local de robot. La integración física queda pendiente.

La etapa 3 usa **correo dry-run por defecto** y no envió correos reales durante su implementación. [Configuración de correo](docs/ARY_EMAIL_SETUP.md), [seguridad y privacidad](docs/ARY_SECURITY_AND_PRIVACY.md) y [cierre y bloqueos](docs/ARY_STAGE3_REPORT.md). No se hizo commit, push ni despliegue.

## Arranque local

Usar Node **24.x LTS**, fijado en `engines.node` y soportado por Vercel: los scripts TypeScript se ejecutan con type stripping nativo, sin transpilador externo. Desde la raíz:

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

«Preparar solicitud» conserva el TXT y muestra un segundo paso con casilla de tratamiento desmarcada y «Enviar solicitud». La API exige aceptación explícita del aviso. El resultado muestra referencia/estado o error y reintento. El TXT permanece disponible durante el paso de consentimiento y ante errores. El resultado y aviso nuevo solo aparecen tras preparar la solicitud; el HTML/CSS de la landing en reposo se conserva.

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

Migraciones: `0000_ary_core`, `0001_stage3_email_privacy`, `0002_stage4a_ai_robot` y `0003_stage4b_staff_leads`, con journal, snapshots y rollback de pruebas. Hay 31 tablas. La etapa 4A incorpora `ai_usage`, `robot_events` y `robot_commands`. `npm run db:generate` genera futuras migraciones. Los SQL de `drizzle/rollback/` son destructivos, exclusivos de BD vacías/de pruebas autorizadas, y no se ejecutan automáticamente. El rollback de etapa 3 se aplica antes del inicial.

Correo/privacidad requieren `AUTH_SECRET` y `SESSION_ENCRYPTION_KEY` de alta entropía en producción (mínimo 32 caracteres cada uno); sin ellas, 503. `EMAIL_DRY_RUN=true` y la ausencia de remitente/clave seleccionan siempre el adaptador local. `RESEND_WEBHOOK_SECRET`, `ADMIN_NOTIFICATION_EMAIL` y los demás placeholders están en `.env.example`. No imprimir secretos. Las filas transaccionales se despachan tras el commit de su petición, con timeout HTTP de 10 s, bloqueo de fila e idempotencia. El cron diario de `vercel.json` queda para reintentos y operaciones diferidas, con descarte de enlaces caducados. Su operación real requiere configurar el despliegue.

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

## Etapa 4A

Después de las recomendaciones, «Pregúntale a Ary» acepta texto, muestra tres preguntas y enlaza las fuentes. `/experiencia` restaura el historial de la sesión al recargar. El servidor decide el modo de cada respuesta y la UI muestra «IA en línea · Gemini» o «Respuestas de ejemplo». Temas sensibles se derivan sin modelo. El historial es temporal y cifrado. Micrófono, TTS y conservación entre sesiones quedan pendientes de autorización específica.

`GEMINI_API_KEY` es privada de servidor. `AI_MODEL` usa `gemini-3.5-flash-lite` por defecto, confirmado como disponible y estable. La comprobación real de esta tarea consumió tres peticiones, una de modelos y dos generaciones con la referencia inicial 3.6, ambas fallidas, la segunda con 503. Las pruebas mockeadas pasan. El modelo final y la operación real requieren verificación posterior. [Pipeline y evidencia](docs/ARY_AI.md).

`ROBOT_BRIDGE_SECRET` firma tokens de 120 s para un kiosco activado. El servicio Python escucha únicamente en `127.0.0.1:8765` y usa SSE + POST con origen/token, allowlist y límites. `ROBOT_DEVICE_AUTH_SECRET` firma telemetría HTTPS y polling secundario de mantenimiento. Simulador, serie/ACK, cola offline, firmware y systemd están en [pi/](pi/README.md). La presencia muestra bienvenida sin iniciar sesión. [Despliegue reproducible](docs/DEPLOY_VERCEL_AND_PI.md).

```sh
cd pi
python -m unittest
```

Cierre actual en [ARY_STAGE4A_REPORT](docs/ARY_STAGE4A_REPORT.md). Los E2E están escritos. Build/dev/ejecución E2E se bloquean con `spawn EPERM`, y el host de navegador está inaccesible. Las dos pasadas visuales de etapa 4A y la regresión actual de 0 píxeles quedan pendientes. La evidencia histórica anterior se conserva por separado.

## Etapa 4B ? operaci?n y proveedores

Paneles `/admin` y `/partner`, acceso separado en `/admin/entrar`, RBAC por organizaci?n en SQL, anal?tica agregada/CSV con supresi?n <10, CMS y fuentes HTTPS protegidas contra SSRF, dispositivos, organizaciones/invitaciones, moderaci?n de ofertas, solicitudes B2B y seguimiento de borrado. No hay MFA nativo; se documenta la opci?n futura TOTP/IdP.

```powershell
npm run db:migrate
npm run admin:create -- --email staff@example.invalid --org "Ary Admin" --role superadmin
npm run demo:seed
# Con el servidor detenido y la misma BD demo:
npm run demo:reset
```

El bootstrap fuerza dry-run. En producción exige `--print-link` en la terminal interactiva privada del propietario para obtener un enlace de un uso y quince minutos; nunca imprime claves de configuración. No hay usuario predeterminado. El seed de demo crea solo identidades ficticias @example.invalid y 129 eventos sint?ticos, claramente DEMO, y está bloqueado por defecto fuera de local. Para un recorrido completo, seguir [el guion de cinco minutos](docs/ARY_WRO_DEMO_SCRIPT.md), que incluye contenido cultural, activaci?n y perfiles de navegador.

`FEATURE_ENABLE_PARTNER_SHARING=false` conserva ocultas las solicitudes. Con true, una oferta aprobada permite elegir proveedor/campos, confirmar y crear un lead cifrado, consentimiento y recibo transaccional. Revocar en `/cuenta/privacidad` bloquea accesos futuros; lo ya visto no se recupera. `PROVIDER_LEAD_RETENTION_DAYS=30` (m?ximo 90) es un plazo propuesto. Nunca se comparte chat o perfil completo.

`FEATURE_ENABLE_MARKETING=false` no crea campa?as ni destinatarios. Activado, el panel muestra preview/recuento y exige confirmaci?n para encolar; solo DOI y consentimiento vigentes, sin supresi?n. No env?a desde la acci?n de crear campa?a. El dispatcher revalida y procesa diez filas por invocaci?n.

Se a?ade `/api/internal/cleanup` a las 14 UTC diariamente; el dispatcher sigue a las 13 UTC. Ambos requieren `CRON_SECRET`; no se han desplegado. El l?mite diario de Hobby y sus l?mites de cantidad est?n documentados en [operaci?n](docs/ARY_OPERATOR_AND_PARTNER.md).

[Arquitectura](docs/ARY_ARCHITECTURE.md), [permisos y operaci?n](docs/ARY_OPERATOR_AND_PARTNER.md), [diagrama WRO](docs/WRO_TECH_DIAGRAM.md), [hip?tesis B2B](docs/ARY_B2B_BUSINESS_MODEL.md), [tabla final](docs/FEATURE_MATRIX.md) e [informe de ejecuci?n](docs/ARY_STAGE4B_REPORT.md). La verificaci?n del revisor de 4A se conserva en su informe y no acredita las nuevas interfaces de 4B. Las dos pasadas visuales y E2E de 4B quedan pendientes del runtime fuera del sandbox; no se declara producci?n validada.

## Etapa 5: preparación de producción

Seguir [DEPLOY_CHECKLIST](docs/DEPLOY_CHECKLIST.md) antes de publicar. Incluye GitHub privado, Vercel web, Neon, dominio, Resend, acceso inicial, Pi, rollback y rotación. Esta etapa no hace commits, push, despliegues, envíos ni llamadas a Gemini.

```powershell
npm run deploy:secrets
# Completar el archivo privado en un editor, sin imprimirlo.
npm run deploy:check -- --env-file .env.production.local
npm run build:empty-env
# Solo el propietario, contra su BD de destino, fuera de esta ejecución:
npm run db:migrate -- --env-file .env.production.local
npm run db:seed -- --env-file .env.production.local
```

El generador conserva archivos existentes; `--force` guarda primero una copia privada ignorada y regenera todo el archivo. El comprobador muestra nombres y estados, falla si faltan variables obligatorias y no verifica proveedores por red. Resend es opcional mientras el correo esté en dry-run. `db:seed` publica solo fuentes culturales verificadas y usa `demo=false` en producción; `demo:seed`/`demo:reset` tienen un bloqueo separado antes de conectar. El primer acceso con `--print-link` se hace solo en la terminal del propietario, nunca en este chat. Región `iad1` con Neon `us-east-1`, sin el obsoleto `preferredRegion`. [Resultados y límites de etapa 5](docs/ARY_STAGE5_REPORT.md).
