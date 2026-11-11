# Codex — Etapa 3: correo, recuperación, consentimientos, privacidad y solicitud B2B real

Sigues en `D:\Ary The Parrot`. Las etapas 1 y 2 están hechas, verificadas y commiteadas (73 E2E en verde). Léelas en:

- `docs/FEATURE_MATRIX.md`
- `docs/ARY_QR_HANDOFF.md`
- `README.md`
- el código de `src/`

Documento rector: `docs/ARY_PROMPT_MAESTRO.md`. En esta etapa aplican sobre todo:

- 0B, la migración del formulario.
- 2, Flujo B.
- 5.
- 8.
- 11.
- 12.
- 13, puntos 3, 4, 5, 9 y 11.

## Restricciones

- No toques `legacy/`, `public/brochure.html` ni `public/assets/`.
- En `public/index.html` y `public/site/landing.js` solo puedes hacer el cambio del formulario descrito abajo. El diseño visual de la landing no debe cambiar (la regresión exige 0 píxeles distintos).
- No hagas commits ni push.
- **No envíes correos reales.**
- Ignora memorias de otros proyectos. Gemini sí es el proveedor de IA de este proyecto, pero no se usa en esta etapa.
- Tu sandbox no lanza Chromium ni `next dev` (`spawn EPERM`). Escribe los E2E con cuidado; el revisor los ejecuta. Errores frecuentes que el revisor tuvo que corregir antes, evítalos:
  - `getByRole("alert")` choca con el anunciador de rutas de Next.js; usa `.filter({ hasText })`.
  - Instala `page.clock` **antes** de cargar la página.
  - Espera a que termine una acción asíncrona antes de adelantar el reloj.
  - Un salto de reloj puede saltarse estados intermedios.
- No metas rodeos de sandbox en la configuración del proyecto.

## Proveedor de correo

`EmailProvider`, en `src/server/email/`, con estas operaciones:

- `sendTransactional`
- `sendConfirmation`
- `sendReminder`
- `sendMarketing`

Implementaciones:

- `ResendEmailProvider`: usa la API HTTP de Resend con `fetch`. Consulta la documentación actual de Resend. No necesitas el SDK si no aporta.
- `DryRunEmailProvider`: guarda el mensaje renderizado en `email_outbox` con `deliveryState = "dry_run"` y **no sale de la máquina**.

Cuál se usa:

- `EMAIL_DRY_RUN` vale `true` por defecto. Con dry-run, o si falta `RESEND_API_KEY` o `EMAIL_FROM`, se usa dry-run.
- La UI dice la verdad: «Modo prueba: el correo no se envió; en desarrollo puedes ver el enlace en /dev/outbox». Nunca dice «enviado».
- `/dev/outbox` solo existe con `NODE_ENV !== "production"`. Muestra los últimos mensajes dry-run para la demo; en producción devuelve 404.

Cola y envío:

- Todo correo pasa por **outbox con `idempotencyKey`**.
- `POST /api/internal/email-dispatch` está protegido con `Authorization: Bearer ${CRON_SECRET}`, con comparación en tiempo constante. Procesa lotes con reintentos y guarda `lastError` saneado.
- Añade la configuración de Vercel Cron en `vercel.json` y documenta que la frecuencia depende del plan.

Webhook:

- `POST /api/email/webhook` para rebotes y quejas, con verificación de firma del webhook de Resend (svix).
- Si falta `RESEND_WEBHOOK_SECRET`, responde 503.
- Las supresiones bloquean envíos futuros.
- **Una respuesta 200 de la API no equivale a «entregado».** `deliveryState` distingue: `queued`, `dry_run`, `accepted_by_provider`, `delivered`, `bounced`, `complained`, `failed`.

Plantillas:

- HTML y texto, en `es` y `en`, con las 6 plantillas de la sección 8 del prompt maestro.
- Remitente identificado, finalidad y caducidad del enlace.
- En las de marketing: baja con un clic (`List-Unsubscribe` + `List-Unsubscribe-Post`) y enlace a preferencias.
- Sin datos del chat ni del perfil completo.

## Cuenta opcional y enlace mágico (Flujo B)

Botón **«Guardar mi experiencia y recibir un enlace por correo»** en `/experiencia` y `/mi-cultura`. Lleva a un formulario en `/reingresar` (o en un modal) con:

- El email.
- Una explicación clara de la finalidad, la conservación y la frecuencia.
- Un consentimiento `transactional_recovery`, necesario para enviar el enlace.
- Una casilla **distinta y desmarcada** para `marketing_email`, que solo se muestra si `FEATURE_ENABLE_MARKETING=true`. Si está en `false`, no aparece.

Comportamiento de `POST /api/auth/request-link`:

- Normaliza el correo con trim y minúsculas en el dominio, sin sobre-normalizar.
- Guarda `emailLookupHash` (HMAC con `AUTH_SECRET`) y el email cifrado (AES-256-GCM con `SESSION_ENCRYPTION_KEY`). En desarrollo y tests, usa claves de prueba derivadas y rotuladas. En producción, si faltan las claves, responde 503.
- **Respuesta idéntica exista o no la cuenta**, para evitar enumeración. Aplica rate limit por email-hash y por cliente, usando la tabla `rate_limits`.
- Token de 256 bits guardado como hash. TTL de 15 min, un solo uso.

Verificación y sesión:

- `/auth/verify?token=…` muestra un botón de confirmación. El `POST` a `/api/auth/verify-link` consume el token de forma atómica y crea o vincula `visitor_accounts`. **Solo en ese momento** se considera propietario a quien controla el correo.
- Al verificar: rota la sesión (cookie nueva), vincula la sesión anónima actual al `ownerUserId`, fusiona los guardados sin duplicados y redirige limpiando la URL.
- Tras verificar, el visitante recupera Mi cultura desde **otro dispositivo**.
- Conocer el correo no da acceso. El enlace no incluye datos.

## Consentimientos y privacidad

- Consentimientos:
  - `POST /api/consents`, `GET /api/consents` y `DELETE /api/consents/:purpose`.
  - Propósitos: `service_storage`, `transactional_recovery`, `marketing_email`, `provider_share`, `analytics_optional`.
  - Cada registro guarda `noticeVersion`, `locale`, `source` y `proof`. La revocación conserva el historial.
- Página `/cuenta/privacidad` con:
  - Consentimientos activos y revocación.
  - Datos guardados.
  - `POST /api/privacy/export`: devuelve un JSON descargable con los datos del titular autenticado.
  - `POST /api/privacy/delete`: crea un `deletion_jobs` y borra o anonimiza sesiones, guardados, cuenta, tokens y suscripciones; cancela los correos pendientes. Explica sus límites (backups y datos ya transmitidos).
- Marketing:
  - Double opt-in: el correo de confirmación activa `email_subscriptions` solo al hacer clic.
  - `POST /api/email/preferences`: frecuencia, pausa y baja.
  - Antes de cada envío de marketing se comprueba en servidor el consentimiento y la supresión. **Marketing sin opt-in = cero envíos.**
  - Con `FEATURE_ENABLE_MARKETING=false` no se encola ningún marketing.
- Actualiza `/privacidad` con estos propósitos y marca lo que requiere revisión jurídica.

## Solicitud comercial «Solicitar tu Ary» (real)

- `POST /api/commercial/inquiries`:
  - Validación con Zod de `name`, `org`, `email`, `place`, `message`, más `locale` y `consentVersion`.
  - Honeypot invisible, rate limit y `Idempotency-Key`.
  - Guarda en `commercial_inquiries`, una **tabla nueva separada de los visitantes**, con `source`, `status`, `createdAt`, `leadType`, `locale`, `consentVersion` y una referencia legible (por ejemplo `ARY-2026-XXXX`). Escribe también en `audit_logs`.
- Correos de la solicitud:
  - Acuse transaccional al solicitante (dry-run según configuración).
  - Notificación a `ADMIN_NOTIFICATION_EMAIL` si está configurado.
  - Nunca entra en campañas.
- Formulario actual (`#solicitar`), con **cambio mínimo** en `public/site/landing.js` y, si hace falta, un aviso de tratamiento en `public/index.html`:
  - Al pulsar «Preparar solicitud», además de lo de siempre, se hace el `POST`.
  - Si va bien, muestra la referencia y el estado real («Recibida · ARY-…» o «Guardada en modo prueba»).
  - Si falla, muestra «No se pudo enviar» con reintento.
  - **El botón «Descargar solicitud .txt» se conserva siempre.**
  - Si añades texto visible nuevo, que solo aparezca tras enviar, para que la comparación de píxeles en reposo siga a 0. Actualiza los tests de la etapa 1 que dependan del texto del resultado, sin debilitar el resto.
- En producción sin BD: error honesto y el TXT sigue disponible.

## Tests

Vitest con PGlite:

- Enumeración: misma respuesta para un correo existente y uno inexistente.
- Token mágico: un solo uso, caducado y alterado.
- Rate limit.
- Recuperación desde otro «dispositivo» (otra cookie) con fusión de guardados.
- Otra persona que conoce el correo no obtiene la sesión.
- Marketing sin opt-in: cero filas encoladas. Double opt-in: activo. Baja: cero envíos posteriores.
- Supresión por rebote.
- Firma del webhook: válida e inválida.
- Dispatch sin `CRON_SECRET`: 401.
- Exportar y borrar.
- Solicitud B2B: idempotente, honeypot y separada de los visitantes.
- Dry-run: nunca llama a `fetch` de Resend (mock).
- Producción sin claves: 503.

Playwright:

- Flujo B completo en dry-run: guardar → correo en `/dev/outbox` → abrir el enlace en otro contexto → recuperar Mi cultura.
- Formulario corporativo:
  - Envío con referencia.
  - Error con el backend caído, con el TXT disponible.
- `/cuenta/privacidad`: exportar y borrar.

## Docs

- `docs/ARY_EMAIL_SETUP.md`: Resend, verificación de dominio (SPF/DKIM/DMARC del dominio `arytheparrot.app`), variables, plantillas, double opt-in, webhook, cron, baja y pruebas.
- `docs/ARY_SECURITY_AND_PRIVACY.md`: modelo de datos personales, cifrado, retención, consentimientos y amenazas.
- Actualiza `docs/PRIVACY_COMPLIANCE_REVIEW.md`, `FEATURE_MATRIX.md`, `ARY_IMPLEMENTATION_PLAN.md`, `.env.example` (nuevas variables solo como placeholders) y el README.

## Criterio de terminado

- `lint`, `typecheck`, `test` y `build` pasan (o queda documentado el error exacto del sandbox).
- E2E escritos.
- Al terminar, imprime: archivos, migraciones nuevas, variables nuevas, comandos con su resultado y bloqueos.
