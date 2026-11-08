# Etapa 4B · implementación local y evidencia

8 de noviembre de 2026. Se ejecutó `docs/codex/STAGE4B.md` sobre las etapas anteriores, leyendo la matriz, README, documento maestro y notas del revisor. No se usaron memorias de otros proyectos, Gemini ni subagentes. No hubo commits, push, despliegue, instalación de herramientas ni correo real. No se imprimieron claves ni credenciales.

## Resultado

Implementados acceso de personal, RBAC, paneles de operador/proveedor, CMS, dispositivos, organizaciones, campañas con cola, analítica agregada, solicitudes consentidas y documentos WRO. **La aceptación visual y la ejecución E2E de esta etapa siguen pendientes por el sandbox.** Los resultados del revisor de etapas anteriores no se atribuyen a estos cambios.

Staff usa enlaces de quince minutos y propósito propio, canje único/atómico, cookie `ary_staff` HttpOnly/Strict (Secure en producción), ocho horas y rotación. Se revalida membresía/organización y rol en cada página/API. Cada consulta de partner incorpora organización en SQL, incluso al mutar por ID. Auditoría para accesos y cambios; el personal de proveedor no accede a analítica global, B2B, sesiones o chats. No existe MFA nativo: TOTP/IdP queda documentado como integración futura.

Analytics agrega en SQL, conserva solo metadatos permitidos y suprime 0–9 también en muestra, ratio y CSV. El ratio se oculta si numerador, denominador o diferencia permiten deducir un grupo pequeño. Hay filtros de periodo y kiosco, y organización en la API global; métricas partner por proveedor del tenant. `originKioskId` permite atribuir conversiones posteriores al QR sin introducir una identidad del visitante en analytics. Las ventanas solapadas aún pueden permitir inferencias; no se promete privacidad diferencial ni personas únicas.

CMS permite es/en por clave, intereses asociados, fuentes/licencia/editor/fechas, borrador→revisión→publicación, puentes, preview textual y QR público. Editar anula la verificación y vuelve a borrador. Checker HTTPS con DNS público, conexión fijada, TLS por hostname, sin redirects y con timeout; comprobar disponibilidad no sustituye revisión factual/editorial. Unitarias prueban bloqueo SSRF y transporte simulado. No se acredita HTTP externo en vivo de este checker durante la tarea.

Ofertas propias quedan `pending_review` al crear/editar y las modera operador/superadmin. «Patrocinado» es visible y no modifica fichas/ranking. Leads: destinatario único aprobado, cuenta verificada en dispositivo personal, campos elegidos y confirmación explícita; consentimiento versionado/proof, payload cifrado, TTL, idempotencia, recibo inmediato tras commit y auditoría. Solo se comparte correo verificado si se elige como método de contacto. Revocación específica/global borra el payload e impide futuras lecturas/cambios; lo ya visto queda fuera del alcance técnico de recuperación. Se puede revocar aunque el flag se apague.

Campañas muestran preview y recuento, nunca destinatarios; requieren confirmación, flag, DOI, consentimiento, frecuencia y ausencia de supresión. Solo encolan; no se despachan desde la acción, tampoco en dry-run. El dispatcher vuelve a comprobar políticas. Lote actual de diez filas: campañas mayores requieren invocaciones autorizadas adicionales o ampliación posterior del trabajador. B2B y trabajos de borrado tienen bandejas con acceso separado; B2B histórico `received` se muestra como nuevo y permite nuevo/en curso/cerrado.

## Archivos

Inventario completo con SHA-256 en [files.json](evidence/stage4b/files.json). Grupos principales:

- Datos: `src/db/{schema,cleanup,demo}.ts`, migración/snapshot/journal/rollback 0003 y pruebas de encadenamiento/rollback.
- Servidor: `src/server/{staff,staff-page,admin,analytics,leads,source-check,stage4b-http}.ts[x]`; integración en `service`, `auth`, `consents`, `privacy`, chat y plantillas/outbox.
- Rutas: `app/admin/entrar`, `app/admin/[[...section]]`, `app/partner/[[...section]]`, API catch-all y `/api/internal/cleanup`; cabeceras privadas en `next.config.ts`.
- UI: shell/login/overview de staff, espacios admin y partner, gestor CMS, ofertas/confirmación y solicitudes/revocación en privacidad; integración en experiencia/Mi viaje y CSS propio.
- Herramientas: `scripts/{admin-demo,generate-stage4b-migration}.ts`, fixture E2E, package scripts y dos cron diarios.
- Pruebas: `tests/unit/{stage4b,source-check}.test.ts`, actualización del test de snapshot/rollback y `tests/e2e/stage4b.spec.ts` con proyecto Playwright propio.
- Documentación: arquitectura, operación/proveedores, guion WRO, diagrama, modelo B2B, diseño previo, matriz/plan/README, seguridad/correo y registro visual.

Los diez archivos protegidos coinciden **byte a byte con HEAD**, incluidos `legacy/`, `public/index.html`, `public/brochure.html` y los activos. [Hashes](evidence/stage4b/protected-files.json). No se alteró `public/site/landing.js` tampoco. Esto prueba preservación de archivos; la regresión de **0 píxeles de 4B no se ejecutó**.

## Migración y variables

`drizzle/0003_stage4b_staff_leads.sql`: quince sentencias DDL. Añade `staff_sessions`, `campaigns`, `organizations.demo`, organización de invitación en magic links, payload/idempotencia del lead y referencias de kiosco para eventos/origen de sesión. Incluye FK, uniques, índice de expiración de staff, snapshot, journal y rollback de pruebas. Migrada dos veces en PGlite aislada; encadenamiento y rollback completo probados en memoria. No se conectó Neon real ni se migró la BD habitual del desarrollador.

Nueva variable: `PROVIDER_LEAD_RETENTION_DAYS` (propuesta 30 días, máximo 90). Reutilizadas: `FEATURE_ENABLE_PARTNER_SHARING`, `FEATURE_ENABLE_MARKETING` (ambas false por defecto), `ANALYTICS_RETENTION_DAYS`, `AUTH_SECRET`, `SESSION_ENCRYPTION_KEY`, `RATE_LIMIT_SALT`, `APP_BASE_URL`, `DATABASE_URL`, `PGLITE_DATA_DIR`, `EMAIL_DRY_RUN`, configuración de correo y `CRON_SECRET`. Los TTL de staff son fijos, quince minutos/ocho horas. No se añaden secretos públicos ni credenciales predeterminadas.

Dos cron diarios en `vercel.json`: email 13 UTC y cleanup 14 UTC, con Bearer secreto. Según la [documentación oficial consultada](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing), Hobby admite 100 cron por proyecto y ejecución diaria con precisión horaria. Aquí solo se preparó configuración; no se desplegó ni se acreditó su funcionamiento remoto.

## Comandos y resultados observados

| Comando / comprobación | Resultado |
| --- | --- |
| `node scripts/generate-stage4b-migration.ts` | PASS, quince sentencias, snapshot/journal |
| `npm run db:migrate`, dos veces, `.cache/stage4b-cli` | PASS, idempotente |
| `npm run demo:seed`, dos veces, BD aislada | PASS, 129 eventos sintéticos sin duplicado y personal @example.invalid |
| `npm run admin:create -- --email bootstrap.stage4b@example.invalid --org "Ary Admin (prueba local)" --role superadmin` | PASS, organización/membresía y acceso en outbox dry-run, sin imprimir enlace |
| `npm run db:cleanup`, BD aislada | PASS |
| `npm run demo:reset`, dos veces, BD aislada | PASS, conserva organización/membresía del bootstrap; elimina proveedores/eventos demo |
| Readback SQL de CLI | PASS: una organización, una membresía, cero proveedores/eventos demo; un correo dry-run, cero filas en otro estado |
| `npm run lint` | PASS, cero warnings |
| `npm run typecheck` | PASS, comprobación independiente del build |
| `npm test` | PASS, 118 pruebas en nueve archivos; 24 nuevas respecto a las 94 anteriores |
| `npm run build` | Compila correctamente en 5,1 s; falla después en `Running TypeScript ... spawn EPERM`, exit 1 |
| `npm run test:e2e -- --list` | PASS de descubrimiento, 95 casos en cinco archivos, seis nuevos de 4B |
| `npm run test:e2e -- --project=stage4b` | BLOCKED: `Error: spawn EPERM` antes de ejecutar casos |
| `npm run dev` | BLOCKED: `spawn EPERM`, errno -4048, syscall spawn, `next-dev.js:393:45` |
| Inventario del navegador CUA | BLOCKED: `failed to write kernel assets: The system cannot find the path specified. (os error 3)` |
| `git -c core.whitespace=cr-at-eol diff --check` | PASS; respeta el CRLF preexistente de Playwright sin cambiar configuración del repo |
| Comparación de archivos protegidos con HEAD | PASS, diez archivos con bytes idénticos |

Logs en [evidence/stage4b](evidence/stage4b/), incluidos [readback CLI](evidence/stage4b/cli-readback.json), lint/typecheck/test/build, dev y E2E. La BD de CLI quedó aislada bajo `.cache/`, ignorada por Git. Las pruebas de seed/reset también conservan una organización ajena al namespace demo. No se llamó a un proveedor de correo real ni a Gemini.

## Cobertura y pendientes

Unitarias: enumeración/TTL/uso único/carrera/purpose de staff, rotación/cookie, invitación y suspensión, escalada vertical y aislamiento horizontal en todos los endpoints partner, CRUD ajeno, analítica/CSV/ratio/kiosco, fuente obligatoria/estados CMS, localhost/10.x/169.254.x/IPv6/DNS mixto, pinning/TLS/redirect/timeout, campos autorizados/cifrado/proveedor único/recibo/idempotencia/revocación/flag, campañas desactivadas sin filas y políticas de cola/supresión, cleanup y cron sin autorización, seed/reset/migraciones.

E2E escritos: staff entra por outbox y ve muestra/«<10»/CSV; A no ve B ni administra; visitante comparte campos con P y revoca; CMS de borrador a publicada usando una fuente sintética ya comprobada; dos recorridos de capturas en escritorio/móvil, permiso denegado, enlace inválido, confirmación, error de red y revocación. El fixture CMS **no prueba verificación HTTP real**.

Las dos pasadas visuales reales siguen pendientes: [registro exacto](evidence/stage4b/visual-review.md). No se miraron capturas de estas interfaces ni se afirma aceptación visual, accesibilidad contrastada en navegador o regresión de píxeles. El revisor debe ejecutar E2E, mirar las capturas, recorrer controles/estados y corregir/recargar según `visual-review-loop`.

También pendientes: Neon y correo/DNS reales, cron desplegado, revisión jurídica (responsable, retención, menores, transferencias), MFA si se exige, Pi/firmware/hardware físicos y uso real de los proveedores. No se hicieron cambios de configuración para eludir los bloqueos del sandbox. La documentación comercial presenta hipótesis, no contratos; Arajet solo aparece como oportunidad futura.

## Verificación del revisor (2026-11-08)

Ejecutado fuera del sandbox, sobre el árbol final:

- `lint`, `typecheck`, `npm test` (118) y `npm run build`: **PASS**.
- `python -m unittest` en `pi/`: **PASS**.
- Playwright: **94 pasan y 1 se omite**. Incluye 0 píxeles de diferencia en la landing, aislamiento A/B de proveedores, el lead compartido y revocado, el CMS de borrador a publicada, el login de staff por outbox y las dos pasadas visuales 4B.
- **Corrección de producto.** En ≤820 px, `.staff-layout` usaba `1fr`, que no encoge por debajo del contenido. `/admin/dispositivos`, `/admin/organizaciones` y `/admin/privacidad` se desbordaban a 380–560 px en móviles de 360–390 px. Ahora usa `minmax(0, 1fr)`.
- **Corrección de pruebas.** Nuevo `tests/e2e/warmup.ts` (`globalSetup`). Compila cada ruta del servidor `next dev` antes de empezar. Con 4B, la compilación en frío de muchas rutas a la vez hacía que Turbopack enviara recargas completas a las pestañas abiertas. Es un efecto solo de desarrollo y no existe en producción.
- **Revisión puntual de seguridad:**
  - `source-check.ts` fija la IP validada, rechaza redirecciones, puertos no 443 y rangos privados o reservados.
  - Las consultas de leads filtran por `organizationId` y por consentimiento no revocado en SQL.
- **Escaneo de secretos:** sin claves en el repositorio ni en el log de Codex. Sin `NEXT_PUBLIC_*`. Sin diff en `legacy/` ni `public/`.
- **Sin validar:**
  - Neon real.
  - Resend real, porque el correo sigue en dry-run.
  - Gemini en vivo; ver la nota de 4A.
  - Pi y Arduino físicos.
  - Límite de crons de Vercel Hobby con dos crons diarios; comprobar al desplegar.
