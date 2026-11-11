# Etapa 3 · entrega local y evidencia

> **Verificación del revisor (7 nov 2026, fuera del sandbox de Codex):** `lint`, `typecheck`, `test` (59), `build` y `test:e2e` pasan: **80 passed, 1 skipped**, incluida la regresión de la landing (0 píxeles distintos) y los flujos de las etapas 2 y 3.
> Correcciones del revisor:
> - `csrf()` resuelve `APP_BASE_URL` antes del `try`, para que una URL base mal configurada devuelva 503 y no un 403 de CSRF.
> - El test de activación del kiosco reintenta el clic si llega antes de la hidratación en un servidor dev en frío.
> - `vercel.json`: el cron pasa a diario (`0 13 * * *`), porque Vercel Hobby solo admite cron diarios.
>
> **Pendiente (etapa 4):**
> - Los correos transaccionales (enlace mágico, acuse B2B, confirmación double opt-in) solo se encolan y dependen del cron. Deben enviarse en el momento de la petición.
> - El consentimiento del formulario usa `window.confirm`; debe pasar a un paso integrado en la página.


Trabajo del 7 de noviembre de 2026, sobre el repositorio existente. Alcance implementado: recuperación por correo verificado, proveedores de email y outbox, consentimientos/privacidad, double opt-in y solicitudes comerciales B2B separadas. **No hubo commit, push, despliegue, uso de Gemini ni envío de correos reales.**

La implementación y las pruebas de dominio/API están completas localmente. El criterio documental de la etapa permite registrar el error exacto del sandbox para build. Las comprobaciones de navegador y las dos pasadas visuales **no están completas**; no se presenta la etapa como verificada visualmente o en producción.

## Comandos y resultados

| Comando / comprobación | Resultado observado |
| --- | --- |
| `npm run db:generate -- --name stage3_email_privacy` | Bloqueado: `spawn EPERM` al cargar drizzle-kit |
| `node scripts/generate-stage3-migration.ts` | PASS: migración/snapshot/journal generados mediante la API nativa de Drizzle; se añadió después UPDATE de seguridad para placeholders legacy |
| `npm run typecheck` | PASS, sin errores en la versión final de código |
| `npm run lint` | PASS, cero warnings |
| `npm test` | PASS: **59 pruebas en 6 archivos** con migraciones reales de PGlite y correo externo simulado |
| `npm run build` | Repetido sobre el código final: compiló correctamente en 2,6 s; falla después en `Running TypeScript ...` con **`spawn EPERM`**. No es un build completo aprobado |
| `npm run test:e2e -- --list` | PASS: **81 casos descubiertos**, siete nuevos de etapa 3 |
| `npm run test:e2e -- --project=stage3` | No arrancó: `http://127.0.0.1:3000/experiencia is already used ... reuseExistingServer:true ...`. No se modificó la configuración ni se detuvo el servidor existente |
| `npm run dev` | Bloqueado: `Error: spawn EPERM`, `errno: -4048`, `syscall: spawn`, `next-dev.js:393:45` |
| Acceso visual alternativo disponible | Browser access host unavailable; al seleccionar Edge: `Computer Use was not approved to use Microsoft Edge`. Se detuvo ese intento |
| `git diff --check` | PASS |
| Preservación | Unitarias de hashes de `legacy/`, brochure y PNG, HTML completo salvo entrada ya aprobada, CSS literal y todo JS anterior al bloque del formulario: PASS |

No se añadieron opciones/rodeos de sandbox a Next, Playwright o el proyecto. El script de migración usa la API pública ya instalada y no altera el runtime. El servidor existente respondió a una lectura de health como PGlite local/dry-run; esto no valida las nuevas pantallas. La regresión exigida de **0 píxeles distintos** permanece escrita sin bajar tolerancia, pero no se ejecutó sobre la etapa 3.

## Evidencia de pruebas

Las unitarias nuevas cubren normalización sin alterar el local-part, HMAC/cifrado autenticado, respuesta idéntica para cuenta existente/inexistente, no propiedad antes de verificar, token hash/TTL/uso único/alteración, carrera de dos verificaciones y rollback después de consumir; rate limit por cliente/email; otra cookie con unión sin duplicados e invalidación de credenciales antiguas; ningún acceso por conocer el correo; dry-run sin fetch; bandera de marketing/cero opt-in; double opt-in, frecuencia, pausa y baja con headers; firma Svix válida/inválida/caducada y replay; rebote/queja y orden de estados; dispatch sin secreto; HTTP Resend simulado, idempotencia/reintento/error saneado; exportación/borrado propios; producción sin claves 503; B2B idempotente/cifrado/auditoría/honeypot/límite y separado; plantillas ES/EN; revocación de conservación/recuperación; y cleanup de retención.

Playwright nuevo: flujo B con ficha guardada → bandeja dry-run → otro contexto móvil → Mi cultura; replay denegado; B2B con referencia/TXT y fallo/reintento; privacidad exportar/borrar; producción outbox 404 y B2B sin BD 503; y dos recorridos preparados para evidencia visual a 360/390/820/1440. Los contextos de prueba usan identificadores de cliente sintéticos para no agotar mutuamente sus límites persistentes. Los casos están **escritos y descubiertos, no ejecutados**.

## Migración y variables

Nueva migración: `drizzle/0001_stage3_email_privacy.sql`, snapshot `drizzle/meta/0001_snapshot.json` y journal actualizado. Tres tablas nuevas: `commercial_inquiries`, `email_suppressions`, `email_webhook_events` (26 tablas totales). Amplía enlaces pendientes, outbox y actividad de cuentas. Los placeholders legacy `pending` sin mensajes renderizados pasan a failed; no se intenta enviarlos. Rollback solo para pruebas vacías/autorizadas en `drizzle/rollback/0001_stage3_email_privacy.sql`; se probó junto con el rollback inicial en BD aislada. No se migró la BD de un servidor ajeno ni una instancia remota.

Variables añadidas a `.env.example`, **solo vacías/placeholders**: `RESEND_WEBHOOK_SECRET`, `ADMIN_NOTIFICATION_EMAIL`. Reutilizadas: `AUTH_SECRET`, `SESSION_ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CRON_SECRET`, `APP_BASE_URL`, `DATABASE_URL`, `EMAIL_DRY_RUN`, `FEATURE_ENABLE_MARKETING`, `FEATURE_ENABLE_PARTNER_SHARING`, `RATE_LIMIT_SALT` y configuración de retención existente. No se editaron ni imprimieron secretos reales.

## Archivos nuevos

- APIs específicas: `app/api/email/{webhook,unsubscribe}/route.ts`, `app/api/internal/email-dispatch/route.ts`.
- Páginas: `app/auth/verify/page.tsx`, `app/cuenta/privacidad/page.tsx`, `app/dev/outbox/page.tsx`, `app/email/{confirm,baja}/page.tsx`.
- UI: `src/components/{recovery,verify-link,account-privacy}.tsx`, `src/privacy.ts`.
- Servicios: `src/server/{auth,crypto,consents,privacy,commercial,stage3-http}.ts`, `src/server/email/{templates,providers,outbox,webhook}.ts`.
- Datos: los tres archivos de migración/snapshot/rollback indicados arriba; `scripts/generate-stage3-migration.ts`.
- Pruebas: `tests/unit/stage3.test.ts`, `tests/e2e/stage3.spec.ts`.
- Operación/documentación: `vercel.json`, `docs/ARY_EMAIL_SETUP.md`, `docs/ARY_SECURITY_AND_PRIVACY.md`, `docs/ARY_STAGE3_DESIGN.md`, este informe.

## Archivos actualizados

- `app/api/[...path]/route.ts`, `app/reingresar/page.tsx`, `app/globals.css`.
- `src/components/{experience,trip,shared,information}.tsx`, `src/components/types.ts`.
- `src/db/{schema,cleanup}.ts`, `src/server/service.ts`, `drizzle/meta/_journal.json`.
- `public/site/landing.js`: **solo bloque del formulario**, con consentimiento nativo tras preparar, POST, estado/referencia, error/reintento y TXT conservado. `public/index.html` y CSS no se modificaron.
- `next.config.ts` (cabeceras privadas), `playwright.config.ts`, `scripts/e2e-server.ts` (demo forzada a dry-run/marketing false), `.env.example`.
- `tests/unit/{database,legacy}.test.ts`, `tests/e2e/{legacy-regression,stage2}.spec.ts`: último snapshot, preservación del JS fuera del formulario, camino TXT con consentimiento rechazado y formulario de recuperación ya disponible. Se conservan las aserciones visuales/píxeles originales.
- `README.md`, `docs/{FEATURE_MATRIX,ARY_IMPLEMENTATION_PLAN,PRIVACY_COMPLIANCE_REVIEW,VISUAL_REVIEW}.md`.
- `next-env.d.ts`: regenerado automáticamente por `next build` a `.next/types/`.

Se preservaron los cambios encontrados en `.claude/launch.json` y `docs/evidence/stage2/seed-sources.json`; no forman parte de esta implementación y no se revirtieron. `legacy/`, `public/brochure.html` y `public/assets/` no se tocaron.

## Bloqueos y operación pendiente

1. Build completo: lanzamiento del subprocess TypeScript denegado; el typecheck independiente pasa.
2. E2E: puerto ocupado y arranque propio denegado por sandbox; no se cerró infraestructura ajena.
3. Dos pasadas visuales y comparación actual de píxeles: acceso al host de navegador/Edge denegado. Evidencia futura y estados a mirar en [VISUAL_REVIEW](VISUAL_REVIEW.md).
4. Resend, Neon, SPF/DKIM/DMARC de `arytheparrot.app`, cron compatible con un minuto y HTTPS/dispositivos reales: sin configuración/validación operativa en esta tarea. Un cron diario no sirve para los enlaces de 15 min.
5. Revisión jurídica del responsable/contacto, menores, finalidades, contratos, transferencias, retención/backups y derechos B2B. No hay certificación legal ni borrado acreditado de terceros.

La continuidad anónima/QR sigue disponible sin correo. No hay campañas recurrentes, cesión de perfiles ni activación de IA/hardware añadidas en esta etapa.
