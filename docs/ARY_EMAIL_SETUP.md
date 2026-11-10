# Estado y activación · etapa 8 (2026-11-10)

**Estado real observado:** GET público a [health](https://arytheparrot.app/api/health) respondió HTTP 200, email `configured_unverified` a las 17:07:14 UTC. Por tanto, el snapshot «EMAIL_DRY_RUN=true y sin RESEND_API_KEY» de la instrucción no describe el estado que publica hoy el servidor. Este resultado no prueba entrega ni revela claves. No se envió ningún correo ni se pidió un enlace a producción. El conector Vercel disponible no lista el proyecto de Ary, por lo que no se inspeccionaron sus variables. [Evidencia saneada](evidence/stage8/production-email-status.json).

La ejecución local/E2E fuerza `EMAIL_DRY_RUN=true` y `GEMINI_API_KEY=`; las pruebas de Resend usan fetch simulado. La bienvenida muestra «Modo prueba: el correo de verificación no se envía todavía» cuando el adaptador efectivo es dry-run (bandera o clave/remitente ausentes). En modo real la UI solo registra la solicitud; no afirma que se entregó.

Pasos exactos para el propietario, **no ejecutados en esta tarea**:

1. Abrir el proyecto correcto de Ary en Vercel y revisar Production. Si ya está configurado, comprobarlo antes de cambiar nada; health actualmente indica configured_unverified. Mantener Preview/Development en dry-run.
2. En Resend → Domains, verificar el dominio de envío que controla el propietario. Copiar al DNS únicamente los registros SPF/DKIM/retorno proporcionados por esa cuenta y comprobar el estado Verified. Revisar DMARC sin inventar registros ni duplicar SPF. [Documentación oficial de dominios](https://resend.com/docs/dashboard/domains/introduction).
3. En Vercel → Project → Settings → Environment Variables → Production, cargar mediante el editor privado `RESEND_API_KEY` y `EMAIL_FROM` (remitente del dominio verificado), y establecer `EMAIL_DRY_RUN=false`. No copiar valores al chat ni a logs. Configurar `EMAIL_REPLY_TO` si existe un contacto oficial. Mantener las claves estables existentes de cifrado/HMAC y autenticación; no rotarlas para activar correo. Confirmar `APP_BASE_URL=https://arytheparrot.app` y `CONVERSATION_RETENTION_DAYS=90` o el plazo aprobado.
4. Resend → Webhooks: añadir `https://arytheparrot.app/api/email/webhook` con los eventos `email.delivered`, `email.bounced`, `email.complained` y `email.failed`. Copiar su secreto privado a `RESEND_WEBHOOK_SECRET` en Production. El endpoint valida la firma Svix. [Documentación oficial de webhooks](https://resend.com/docs/webhooks/introduction).
5. Antes de publicar este código, aplicar la migración `0004_stage8_conversations` en la BD de destino tras copia/revisión del operador: `npm run db:migrate -- --env-file .env.production.local`. El archivo de entorno es privado, ignorado por Git; nunca imprimirlo. No se migró producción desde esta ejecución.
6. El propietario deberá autorizar y realizar un nuevo despliegue cuando corresponda. Los cambios de entorno aplican a nuevos despliegues, no al anterior. [Vercel: variables de entorno](https://vercel.com/docs/environment-variables). No se hizo redeploy, commit ni push en esta tarea.
7. Comprobar health y, solo con autorización posterior del propietario, pedir un enlace a un buzón controlado: revisar outbox/provider, recepción y confirmación única dentro de 15 minutos. `accepted_by_provider` significa aceptación por Resend; `delivered` requiere webhook y tampoco prueba lectura. Probar rechazo de enlace usado/caducado y nueva sesión sin pedir correo otra vez. Ninguna de estas pruebas de correo real se ejecutó aquí.
8. Verificar `CRON_SECRET` y las tareas ya definidas: dispatcher a 13:00 UTC, cleanup a 14:00 UTC. Los enlaces inmediatos se despachan tras commit; si fallan, solicitar uno nuevo antes de caducar. El cron diario puede llegar después del TTL. No se añadió otro cron.
9. Marketing permanece desactivado mediante `FEATURE_ENABLE_MARKETING=false` hasta decidir habilitar campañas. La casilla separada solo permite preparar DOI; no activa una suscripción sin confirmar el segundo enlace. Retirada/baja/supresión cancelan acceso futuro y DOI pendiente. Nunca enviar campañas por haber verificado el acceso.

---

# Correo de Ary · etapa 3

Implementación local, 7 de noviembre de 2026. No se configuró una cuenta Resend, no se modificó DNS, no se desplegó ningún cron y **no se enviaron correos reales**. La conectividad con Resend se prueba exclusivamente mediante `fetch` simulado.

## Configuración

| Variable | Uso |
| --- | --- |
| `EMAIL_DRY_RUN` | `true` por defecto. Solo el valor literal `false` permite seleccionar Resend |
| `RESEND_API_KEY` | Clave privada de envío. Ausencia/vacío selecciona dry-run |
| `EMAIL_FROM` | Remitente identificado y verificado en Resend. Ausencia/vacío selecciona dry-run |
| `EMAIL_REPLY_TO` | Respuesta opcional al equipo; nunca se expone al navegador |
| `RESEND_WEBHOOK_SECRET` | Secreto `whsec_…` del webhook; sin él, webhook 503 |
| `ADMIN_NOTIFICATION_EMAIL` | Notificación de nueva solicitud B2B, opcional y sin datos del solicitante |
| `CRON_SECRET` | Bearer del dispatcher. Sin secreto o con credencial incorrecta: 401 |
| `AUTH_SECRET` | Secreto de alta entropía, mínimo 32 caracteres; HMAC de email |
| `SESSION_ENCRYPTION_KEY` | Secreto independiente, mínimo 32 caracteres; se deriva clave AES-256-GCM |
| `APP_BASE_URL` | Origen canónico HTTPS en producción, usado para enlaces y CSRF |
| `DATABASE_URL` | PostgreSQL persistente en producción. Sin BD, 503 |
| `FEATURE_ENABLE_MARKETING` | `false` por defecto; sin la función no hay casilla ni confirmaciones/correos de marketing |

`.env.example` contiene solo placeholders y valores públicos/de control. Las claves derivadas de desarrollo están rotuladas `ARY-DEVELOPMENT-TEST-KEY-ONLY`; producción jamás las utiliza. No copiar valores de un proyecto ajeno. La rotación de las claves exige una migración/recifrado y reconstrucción de hashes; no basta con sustituir variables.

## Dominio arytheparrot.app

Antes de habilitar correo real, añadir el dominio en Resend y copiar **los registros exactos de esa cuenta** al proveedor DNS. Verificar DKIM, SPF y el dominio de retorno mediante el panel. Publicar una política DMARC revisada y observar sus informes antes de endurecerla. No crear varios SPF para el mismo nombre ni inventar valores DKIM/MX/TTL o direcciones de informes. El repositorio no acredita que SPF/DKIM/DMARC estén publicados o verificados. Seleccionar un remitente del dominio verificado, identificando al responsable; su nombre/contacto definitivos requieren revisión jurídica.

## Cola y entrega

Todas las operaciones `sendTransactional`, `sendConfirmation`, `sendReminder`, `sendMarketing` pasan por `email_outbox` y una clave idempotente única. Destinatario y mensaje HTML/texto se guardan cifrados con AES-GCM, incluidos los enlaces. El hash del destinatario permite supresión sin guardar el email en claro. Una solicitud B2B no crea cuenta de visitante.

Con dry-run se crea la fila y se marca `dry_run`, sin llamar a Resend. `/dev/outbox` muestra hasta 30 mensajes de las últimas 24 h, texto, enlaces y HTML en iframe sin scripts. **Solo es una herramienta local para datos sintéticos**; no hay autenticación adicional del buzón de desarrollo. En producción la ruta responde 404 antes de acceder a la BD. No exponer un servidor de desarrollo a Internet. La UI dice «Modo prueba: el correo no se envió; en desarrollo puedes ver el enlace en /dev/outbox».

En etapa 4A, recovery, commercial_receipt, commercial_admin y marketing_confirmation se despachan después del commit de la petición, únicamente por sus IDs. Se reutilizan bloqueo de fila e idempotencia del dispatcher. Los fallos permanecen en cola para reintento. `POST /api/internal/email-dispatch` exige `Authorization: Bearer <CRON_SECRET>`, comparado en tiempo constante. Vercel Cron invoca GET; GET está protegido igual y utiliza el mismo dispatcher. Lotes de hasta diez filas, `FOR UPDATE SKIP LOCKED`, timeout HTTP de diez segundos, cinco intentos máximos y backoff exponencial. Se reusa `Idempotency-Key` en cada intento. Solo se guardan códigos de error saneados; nunca cuerpos del proveedor, URLs, correos ni excepciones arbitrarias.

`vercel.json` programa el dispatcher diariamente a las 13:00 UTC. La petición ya intenta los correos inmediatos. El cron queda para reintentos y operaciones diferidas, con descarte de enlaces caducados. Comprobar límites del plan y duración de función antes de desplegar. Un fallo transitorio puede exigir al visitante solicitar un enlace nuevo, pues el siguiente cron diario será posterior al TTL de 15 minutos.

Estados: `queued`, `dry_run`, `accepted_by_provider`, `delivered`, `bounced`, `complained`, `failed`. Resend HTTP 200 solo produce `accepted_by_provider`. `delivered` requiere webhook firmado y significa recepción por servidor de correo, no lectura humana. `sentAt` queda vacío en dry-run. Un rebote/queja prevalece ante eventos delivered tardíos.

## Enlaces, plantillas y consentimiento

Plantillas ES/EN en `src/server/email/templates.ts`: recuperación, double opt-in, guardados solicitados, recordatorio cultural, preferencias/baja y recibo de proveedor. Dos adicionales para acuse B2B y aviso administrativo. HTML escapado y texto plano, finalidad y caducidad; sin chat/perfil completo. Los recibos de proveedor son una plantilla preparada, **no una integración de cesión implementada**. No hay campañas recurrentes ni recordatorios programados automáticamente en esta etapa.

Recuperación: 256 bits, solo hash del token, TTL 15 minutos. GET muestra confirmación; POST consume atómicamente, crea/vincula la cuenta, fusiona guardados y rota la cookie. La respuesta a pedir un enlace es idéntica exista o no una cuenta, también ante supresión. El correo no concede identidad por sí solo.

Marketing: casilla separada sin marcar, consentimiento versionado y otro enlace de confirmación de 15 minutos. Solo su POST activa `email_subscriptions`. Cualquier mensaje de marketing/recordatorio exige encolar con categoría adecuada, consentimiento vigente, double opt-in activo, ausencia de supresión, frecuencia y bandera habilitada. Estos controles se repiten justo antes de enviar. No hay envío sin opt-in.

Los envíos incluyen `List-Unsubscribe` y `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. La URL tiene un token aleatorio de baja que no autentica al visitante. `POST /api/email/unsubscribe?token=…` permite baja de un clic sin cookie (RFC 8058). GET redirige a una confirmación y no modifica nada. La baja conserva historial, invalida confirmaciones anteriores y cancela pendientes. `/api/email/preferences` permite semanal/mensual, pausa, reanudación solo de una suscripción confirmada y baja; no reactiva una baja sin nuevo opt-in.

## Webhook

Configurar `/api/email/webhook` con `email.delivered`, `email.bounced`, `email.complained`, `email.failed`. Se verifica Svix sobre el **cuerpo crudo** (`id.timestamp.payload`, HMAC-SHA256, clave base64 tras `whsec_`), firmas v1 múltiples, comparación constante y tolerancia de cinco minutos. IDs recibidos se deduplican en BD. Sin secreto: 503; firma inválida: 400. El body se limita a 64 KiB. Rebotes/quejas crean supresiones por HMAC, bloquean futuros envíos de cualquier categoría y cancelan pendientes. No habilitar tracking de aperturas/clics como parte de esta etapa.

## Pruebas locales sin envío

1. Mantener `EMAIL_DRY_RUN=true`, marketing desactivado y datos `@example.invalid`.
2. Migrar una BD de desarrollo aislada: `npm run db:migrate`.
3. Guardar una ficha → recuperación → bandeja de prueba → confirmar en otro contexto → Mi viaje.
4. Probar exportación, revocación y borrado en la cuenta sintética.
5. Ejecutar unitarias y E2E. Las pruebas Resend/Svix usan respuestas y firmas locales; nunca envían correo real.

Referencias primarias consultadas: [Resend HTTP send](https://resend.com/docs/api-reference/emails/send-email), [idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys), [verificación de webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests), [Svix manual](https://docs.svix.com/receiving/verifying-payloads/how-manual), [Vercel Cron](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs).

## Personal, recibos y campa?as (4B)

Plantilla staff_login ES/EN: enlace propio a /admin/entrar, quince minutos y un uso. Las invitaciones se confirman con la misma pantalla. Plantilla provider_receipt (plantilla 6): proveedor y nombres de campos, sin valores privados ni chat. Ambas se despachan despu?s de commit, inmediatamente por ID; dry-run no env?a. El bootstrap CLI siempre fuerza dry-run. En etapa 5, producción exige `--print-link` en la terminal interactiva privada del propietario: genera allí un enlace de un uso y quince minutos sin encolar correo; nunca imprime claves de configuración. `/dev/outbox` sigue dando 404 en producción. No ejecutar esa opción en CI, chats o registros compartidos. [Lista de despliegue](DEPLOY_CHECKLIST.md).

Campa?as: flag false por defecto, preview y recuento sin lista de direcciones, confirmaci?n e ID de idempotencia. Encola sin despachar incluso en dry-run. Exige suscripci?n activa, DOI, consentimiento, correo verificado, frecuencia y ausencia de supresi?n; el dispatcher vuelve a comprobarlo. Diez filas por invocaci?n: una campa?a mayor no queda entregada con un solo cron. Revocaci?n, baja y supresi?n bloquean env?os futuros.

Dos cron diarios: email-dispatch a las 13 UTC y cleanup a las 14 UTC, ambos con CRON_SECRET. No fueron desplegados ni enviados correos reales en esta etapa. Configuraci?n/verificaci?n de dominio, SPF/DKIM/DMARC, procesadores y plan real siguen siendo previas a la operaci?n. [Gu?a de personal y proveedores](ARY_OPERATOR_AND_PARTNER.md).
