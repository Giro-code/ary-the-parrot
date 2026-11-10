# Publicar Ary: lista del propietario

Preparación local de etapa 5. **Esta tarea no publicó nada ni envió correos.** Los pasos de GitHub, Vercel, Neon, DNS, correo e IA los realiza el propietario cuando los autorice. No necesitas `gh` ni `vercel` CLI. No copies valores privados a chats, capturas, incidencias o documentos.

## 1. Repositorio privado y rama main

- [ ] En GitHub, pulsa **+ → New repository**, elige **Private**, sin README/licencia inicial y crea el repositorio vacío. Si ya existe y está conectado a Vercel, comprueba su privacidad y conserva esa conexión.
- [ ] En PowerShell, desde este repositorio, comprueba solo los nombres:

```powershell
git status --short
git branch --show-current
git check-ignore .env.local .env.production.local .env.production.local.bak
git ls-files -- .env.local .env.production.local '.env*.local.bak*'
```

Los archivos privados deben estar ignorados y `git ls-files` debe quedar vacío. Antes del primer push revisa también el historial: ignorar un archivo no elimina una filtración anterior. Si hubo una, revoca esas claves y limpia el historial con ayuda técnica antes de subirlo. Los cambios de etapa 5 ya están revisados y guardados en `main`.

- [ ] Con `main` ya revisada y guardada, usa estos comandos **solo tú**; sustituye `TU_USUARIO` y `TU_REPOSITORIO`:

```powershell
git remote -v
# Solo si no existe origin:
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Si `origin` ya existe, verifica el destino y omite `remote add`. No fuerces el push. Comprueba en GitHub que dice **Private** y que no aparecen archivos `.env` privados. Un push puede disparar un despliegue si Vercel ya está conectado: prepara antes los pasos 3–6 o pausa despliegues automáticos en el panel.

## 2. Importar en Vercel

- [ ] Vercel → **Add New… → Project → Import Git Repository**, selecciona el repositorio privado y **Import**. Si el proyecto ya existe, ábrelo sin crear otro.
- [ ] Framework **Next.js**, raíz del repositorio y comandos por defecto: instalación `npm install`/la detectada por el lockfile, build `npm run build`, salida automática. **No añadas migraciones ni seed al Build Command.**
- [ ] En **Settings → Build and Deployment → Node.js Version**, comprueba **24.x**. `package.json` fija esa línea; no necesita Node 26. No pulses todavía **Deploy**; completa primero las variables y Neon.

Verificación: repositorio y rama Production `main` correctos, comandos normales y Node 24. [Versiones de Node admitidas](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 3. Crear Neon en la misma región

- [ ] Proyecto de Vercel → **Storage → Marketplace → Neon → Create**, o crea un proyecto directamente en Neon. Antes de aceptar comprueba el coste/plan mostrado en tu cuenta. Selecciona AWS **US East (N. Virginia), us-east-1**.
- [ ] Vercel → **Settings → Functions → Function Regions**: comprueba **Washington, D.C., iad1**. `vercel.json` ya fija `regions: ["iad1"]`. Si necesitas otra región, cambia Neon y la configuración de Vercel juntos; no basta con cambiar el panel.
- [ ] En Neon → **Connect**, selecciona la base/rol de producción y **Connection pooling**. Copia la cadena pooled al editor privado de `.env.production.local`, en `DATABASE_URL`. Debe usar `postgresql://`, el host pooled y `sslmode=require` (también se aceptan `verify-ca`/`verify-full`). No pongas la cadena en un comando de PowerShell.
- [ ] Si usas integración: **Storage → tu base → Connect Project**, selecciona **solo Production**. La integración inyecta `DATABASE_URL` pooled y otras variables, como `DATABASE_URL_UNPOOLED` y `PG*`; esta app usa únicamente `DATABASE_URL`. No cambies esa variable por una vacía al importar el archivo. Con Neon directo, tendrás que añadirla tú.

- [ ] En «Connect a Project», el **Custom Prefix** debe ser `DATABASE`; por defecto es `STORAGE` y crearía `STORAGE_URL`, que Ary no lee. Activa solo el entorno Production.

Verificación: proyecto/BD/rol correctos, región coincidente y variable asignada únicamente al destino elegido. El cliente actual usa `@neondatabase/serverless` **Pool + WebSocket `ws`**, admite transacciones interactivas y los CLI cierran con `pool.end()` en `finally`. No se ha probado aquí contra Neon real. [Integración Neon](https://neon.com/docs/guides/vercel-managed-integration), [driver](https://neon.com/docs/serverless/serverless-driver), [regiones Vercel](https://vercel.com/docs/functions/configuring-functions/region).

## 4. Generar y completar el archivo privado

- [ ] En tu terminal local:

```powershell
npm run deploy:secrets
```

Ya se generó `.env.production.local` en esta etapa: si existe, el comando lo conserva. Ábrelo en tu editor local privado, sin imprimirlo en terminal. Genera seis secretos independientes con `crypto.randomBytes(48)`, codificados como base64url (64 caracteres). El cifrado deriva AES-256-GCM mediante SHA-256: no espera una clave hexadecimal de longitud fija.

- [ ] Completa `DATABASE_URL` y `GEMINI_API_KEY` con tus credenciales; no copies la clave desde `.env.local` al chat. Deja `EMAIL_DRY_RUN=true`, ambas funciones opcionales en `false` y los TTL/retenciones generados. No incluyas `PGLITE_DATA_DIR` ni el ID exclusivo de la Pi en Vercel.
- [ ] Cuando estén disponibles, completa `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`; son obligatorios al habilitar correo real. `EMAIL_REPLY_TO` y `ADMIN_NOTIFICATION_EMAIL` son opcionales y pueden permanecer vacíos. El formato de correo se comprueba si se rellenan.
- [ ] Ejecuta:

```powershell
npm run deploy:check
# Equivalente explícito:
npm run deploy:check -- --env-file .env.production.local
```

Verificación: código 0 y variables obligatorias en **OK**. Solo se muestran nombres/estados; las claves no salen. Se validan HTTPS/dominio, PostgreSQL con TLS, mínimos de 32 caracteres, separación de claves robot, límites, exposición en `NEXT_PUBLIC_*`, `public/` y `.next/static`, Node y dos crons diarios. Las coincidencias se verifican con SHA-256 internamente, sin imprimir texto ni huellas. Esto no demuestra que las credenciales funcionen ni detecta todas las codificaciones/fragmentaciones posibles de un secreto.

Si no hay build, el comando lo indica y debes repetirlo tras compilar. Si hay un build antiguo, la comprobación cubre ese artefacto local, no el próximo despliegue. No carga `.env.local` ni mezcla credenciales privadas heredadas.

`npm run deploy:secrets -- --force` guarda antes una copia `.env.production.local.bak.<identificador>` ignorada y **regenera/reinicia todo el archivo**, incluidos tus huecos. No lo uses para añadir una sola variable ni para rotar a ciegas; conserva el original en almacenamiento privado. En Windows comprueba que el archivo y sus copias estén accesibles solo a tu usuario; el modo POSIX 0600 no sustituye a las ACL de Windows.

## 5. Importar solo en Production y aislar Preview

- [ ] Vercel → **Settings → Environment Variables → Import .env**, selecciona el archivo privado completo. Marca **solo Production**, revisa los nombres y guarda. Si la integración Neon controla `DATABASE_URL`, conserva el valor pooled de esa misma base y evita duplicados/conflictos.
- [ ] Comprueba que ningún secreto tenga prefijo `NEXT_PUBLIC_`. Conserva `APP_BASE_URL=https://arytheparrot.app` y `EMAIL_DRY_RUN=true`.
- [ ] Para Preview, elige una opción antes de habilitarla: desactivar los despliegues Preview en la configuración Git del proyecto, o usar otra BD/proyecto Neon vacío con datos sintéticos, otras claves y el origen HTTPS exacto de esa Preview. **Nunca reutilices la BD ni las claves de Production.** Una rama Neon copiada de producción puede contener datos reales: no es suficiente aislamiento para esta guía. Revisa las asignaciones automáticas de la integración y sus permisos de Preview.

Verificación: cada variable aparece solo en el entorno previsto. No promociones una Preview con su configuración a Production sin reconstruir con las variables de producción.

## 6. Migrar y sembrar desde tu equipo

- [ ] En Neon configura respaldo/recuperación conforme a tu plan, comprueba la BD de destino y revisa los SQL `drizzle/0000…0003`. En PowerShell:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build:empty-env
npm run db:migrate -- --env-file .env.production.local
npm run db:seed -- --env-file .env.production.local
```

El archivo explícito tiene prioridad y no toma credenciales de `.env.local`; un origen no local activa el modo producción. Si falta la BD, falla sin crear PGlite. El migrador aplica el journal transaccional y es idempotente. La conexión se cierra también ante errores. La aplicación no ejecuta migraciones al arrancar ni durante el build.

El seed cultural comprueba las 12 fuentes por HTTP y carga 24 fichas ES/EN sin identidades de demo. Solo publica fuentes verificadas; el resto queda `needs_source`. Revisa `docs/evidence/stage2/seed-sources.json` y el contenido editorial antes de abrir al público. Repetir el seed actualiza las fichas con esas claves; revisa ediciones manuales antes de repetirlo. Verificar HTTP no sustituye la revisión cultural/jurídica.

**Nunca ejecutes `npm run demo:seed` en producción.** El CLI bloquea seed y reset de demo si el origen no es local o `NODE_ENV=production`, antes de conectar/migrar. Existe el escape explícito `--i-know-this-is-production-demo` solo para pruebas de producción conscientemente autorizadas; no lo uses en el lanzamiento.

Verificación: migraciones completadas, fuentes contadas sin errores privados y tablas presentes en Neon. `build:empty-env` invoca el build habitual en una copia bajo `.cache`, con entorno de producción limpio y sin copiar archivos `.env`; no modifica los originales. En esta ejecución compiló pero el siguiente proceso quedó bloqueado por **`spawn EPERM`**. Repite en tu terminal fuera de ese bloqueo antes de publicar. No se cambió el bundler ni la configuración para sortearlo.

## 7. Primer despliegue y dominio

- [ ] Con los pasos anteriores completos, Vercel → **Deployments → Deploy / Redeploy** de `main` con entorno **Production**. Comprueba el log de instalación/compilación y que termine correctamente. No añadas credenciales a los logs para depurar.
- [ ] **Settings → Domains → Add Domain**: añade `arytheparrot.app`, asociado a Production. Añade `www.arytheparrot.app` y selecciona redirección permanente hacia `arytheparrot.app` para mantener el origen canónico.
- [ ] Si el dominio está en Vercel, revisa **Domains → arytheparrot.app → DNS** y los registros creados/sugeridos. Si Vercel gestiona DNS, normalmente los configura al asociar el dominio; confirma su estado. Si solo es el registrador y usas otros nameservers, modifica el proveedor DNS autoritativo. Copia los A/CNAME/TXT **exactos del panel actual**, elimina conflictos revisados y conserva los registros de correo. No inventes IP, CNAME ni TTL.

Verificación: dominio **Valid Configuration**, certificado HTTPS válido y `www` redirige al dominio sin `www`. [Guía oficial de dominios](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## 8. Comprobar salud y crons

- [ ] Abre `https://arytheparrot.app/api/health`. Espera HTTP 200, `status=ok`, `checks.database=connected`, `checks.email=dry_run`, `checks.ai=configured_unverified` y `checks.robot=simulator`. Sin BD/migraciones debes investigar el 503; no lo des por terminado.
- [ ] Vercel → **Cron Jobs** (o apartado correspondiente de Settings): confirma las rutas `/api/internal/email-dispatch` (13 UTC) y `/api/internal/cleanup` (14 UTC), ambas diarias y protegidas por `CRON_SECRET`. No invoques dispatcher manualmente para probar con destinatarios reales.

Hobby admite frecuencia diaria y precisión aproximada por hora, no entrega puntual de enlaces de 15 minutos. La petición intenta el correo inmediatamente; el cron reintenta y descarta enlaces vencidos. Los dos jobs están dentro del límite publicado vigente; revisa la cuenta antes de activar. El catch-all que atiende IA/correo inmediato y el dispatcher tienen `maxDuration=180`; el webhook, 30 s. IA tiene timeout HTTP de 12 s y cada envío, 10 s. Comprueba que tu plan/Fluid Compute admita los límites configurados; no se acredita aquí ninguna capacidad contratada. [Crons](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing), [duración](https://vercel.com/docs/functions/configuring-functions/duration).

`configured_unverified` significa que hay configuración, no que Gemini/Resend funcionen. Health no hace llamadas de IA ni envía correo.

## 9. Primer administrador con correo todavía en prueba

- [ ] En **tu terminal interactiva privada**, sin grabación/transcripción ni redirección a archivos, sustituye únicamente el correo del propietario:

```powershell
npm run admin:create -- --env-file .env.production.local --email propietario@example.com --org "Ary Admin" --role superadmin --print-link
```

El bootstrap fuerza dry-run y no envía correos. `--print-link` es la excepción solicitada para que **solo el propietario** vea su enlace en la terminal local; se rechaza si stdout no es una terminal. No debe ejecutarlo un agente en una conversación, una CI o un terminal compartido. No muestra claves de configuración.

- [ ] Abre el enlace inmediatamente y confirma el acceso; caduca a los **15 minutos**, sirve una sola vez y solo se guarda su hash. El enlace concede acceso: no lo compartas ni lo incluyas en evidencia. Cierra/limpia esa terminal después. No se encola correo por esta vía.
- [ ] Comprueba `/admin` y que `/dev/outbox` responda **404** en producción. Sin `--print-link`, el CLI se detiene antes de crear el administrador en producción, porque dry-run no entrega el enlace. Si caduca, repite con el mismo nombre de organización/correo; reutiliza la organización administrativa y renueva el enlace, invalidando anteriores. No ejecutes bootstraps simultáneos.

Verificación: acceso con rol superadmin a la organización prevista, segundo canje rechazado y ningún enlace en logs de Vercel. No expongas un servidor de desarrollo para usar su outbox con datos reales.

## 10. Habilitar Resend después de verificarlo

- [ ] Resend → **Domains → Add Domain**, añade el dominio remitente y copia al DNS sus registros exactos. Espera **Verified**, revisa SPF/DKIM/retorno y una política DMARC adecuada. Sigue [ARY_EMAIL_SETUP](ARY_EMAIL_SETUP.md); no dupliques SPF ni inventes registros.
- [ ] En Resend crea la API key de envío del dominio. Completa privadamente `RESEND_API_KEY` y `EMAIL_FROM` con un remitente verificado. Configura Reply-To y notificaciones si las necesitas.
- [ ] Resend → **Webhooks → Add Webhook**, URL `https://arytheparrot.app/api/email/webhook`; eventos `email.delivered`, `email.bounced`, `email.complained`, `email.failed`. Copia el signing secret a `RESEND_WEBHOOK_SECRET`, sin mostrarlo. Comprueba que firma válida se acepta, inválida se rechaza y duplicados no se repiten.
- [ ] Completa las mismas variables en el archivo privado y en **Vercel → Settings → Environment Variables → Production**. Solo después de verificar dominio/remitente cambia `EMAIL_DRY_RUN=false`; ejecuta `deploy:check` local y haz **Redeploy** desde Vercel para aplicar los cambios.
- [ ] Tú mismo solicita un acceso en `/admin/entrar` a tu propio correo. Verifica recepción y el evento firmado. `accepted_by_provider` no equivale a `delivered`, ni `delivered` acredita lectura humana. Las pruebas con correo real quedan fuera de esta tarea.

Verificación: health de correo pasa a `configured_unverified`, envío propio recibido y webhook de entrega registrado. Si falla, vuelve a dry-run y redeploy antes de abrir el servicio.

## 11. Verificar Gemini en producción

El propietario autorizó usar Gemini como proveedor de IA de Ary. Durante la revisión de 4A, la clave y `gemini-3.8-flash` respondieron 200 en una prueba directa. El chat completo aún no se vio en vivo porque Google devolvía 503 por saturación.

- [ ] Abre `https://arytheparrot.app/experiencia`, inicia, elige intereses y haz **una** pregunta cultural, por ejemplo «Cuéntame sobre el merengue».
- [ ] Debe aparecer la etiqueta **«IA en línea · Gemini»** y fuentes enlazadas. Si aparece **«Respuestas de ejemplo»**, Gemini falló (503, timeout o clave): el chat sigue funcionando en demo.
- [ ] Alternativa local, una sola llamada: `node scripts/verify-ai.ts --live`. Imprime el modelo, la latencia y el resultado, nunca la clave.

Verificación: una respuesta real con fuentes y una fila en `ai_usage` con `errorCode` vacío.

## 12. Kiosco y Raspberry Pi

- [ ] Entra como administrador → **/admin/dispositivos → crear/activar dispositivo**. Copia el enlace de activación únicamente al navegador del kiosco y confirma allí antes de diez minutos.
- [ ] Configura la Pi con [DEPLOY_VERCEL_AND_PI](DEPLOY_VERCEL_AND_PI.md): perfil dedicado Chromium, systemd, reloj/red, política loopback por origen, secretos robot privados y distintos, ID público del dispositivo y bridge simulador antes de hardware.

Verificación: kiosco autorizado, reinicio conserva credencial, QR llega al móvil, puente local solo escucha en loopback y hardware sigue identificado como simulado hasta una prueba física. No confundas simulador o E2E de escritorio con aceptación en Pi.

## 13. Revertir y rotar claves

- [ ] Antes de publicar identifica el release anterior y un respaldo de la BD. Para revertir aplicación: Vercel → proyecto → **Production Deployment → Instant Rollback** (o **Deployments → ⋮ → Instant Rollback**), revisa destino/dominios y confirma tú. Comprueba health y rutas después. La disponibilidad de destinos depende del plan. El rollback no deshace datos/migraciones y recupera configuración antigua, que puede contener claves ya revocadas; revisa también crons. [Rollback oficial](https://vercel.com/docs/instant-rollback).
- [ ] `drizzle/rollback/` contiene SQL destructivo: orden inverso **0003 → 0002 → 0001 → 0000**. Lee cada archivo, respalda/restaura primero en una BD aislada y coordina también el journal de migraciones. **No hay rollback automático seguro para producción** y estos scripts eliminan datos/tablas. Para producción, prefiere restauración controlada o migración correctiva compatible; no pegues esos SQL directamente sobre datos activos.
- [ ] Rotación, desde un editor/gestor privado, sin imprimir valores:

| Variable | Procedimiento y efecto que debes comprobar |
| --- | --- |
| `DATABASE_URL` | Cambia credencial del rol en Neon; actualiza conexión pooled local y Production, redeploy y prueba health; revoca credencial anterior de forma coordinada. |
| `AUTH_SECRET` | Mantiene hashes de email y otros identificadores. Requiere migración diseñada para reconstruir HMAC con ambas claves y conservar relaciones/supresiones. No sustituirla directamente; no existe herramienta de rotación automática. |
| `SESSION_ENCRYPTION_KEY` | Descifra correo, outbox y datos privados. Conserva clave anterior en backup seguro y realiza recifrado probado antes de cambiarla. Cambiar sin migrar vuelve ilegibles los registros; no hay CLI de recifrado en esta etapa. |
| `CRON_SECRET` | Genera otro secreto privado de al menos 32 caracteres; actualiza Production y el archivo local, redeploy y verifica autenticación del próximo cron. |
| `RATE_LIMIT_SALT` | Sustituye por valor independiente fuerte, actualiza local/Production y redeploy. Se reinician efectivamente las identidades de las ventanas de rate limit; considera la transición. |
| `ROBOT_DEVICE_AUTH_SECRET` | Actualiza coordinadamente Vercel y `/etc/ary/bridge.env`, reinicia bridge y redeploy; comprueba telemetría. La clave anterior deja de autenticar eventos. |
| `ROBOT_BRIDGE_SECRET` | Actualiza Vercel y Pi, reinicia bridge, redeploy y recarga kiosco para renovar tokens de 120 s; comprueba rechazo de tokens antiguos. |
| `RESEND_API_KEY` | Crea otra key restringida, actualiza local/Production, redeploy y prueba solo tu propio correo; revoca la anterior. |
| `RESEND_WEBHOOK_SECRET` | Renueva el secreto del endpoint en Resend, actualiza local/Production y redeploy; comprueba firmas y posibles reintentos durante el cambio. |
| `GEMINI_API_KEY` | Crea una clave nueva en Google AI Studio, actualiza local/Production, redeploy, haz una pregunta de prueba y revoca la anterior. |

`EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFICATION_EMAIL` y `APP_BASE_URL` se actualizan como configuración, comprobando remitente y origen. Las credenciales de kiosco se revocan/renuevan desde `/admin/dispositivos`; no son los secretos HMAC globales. El token del primer admin expira o se invalida al renovar el bootstrap. Protege y retira las copias `.bak` conforme a tu política: ignoradas por Git sigue significando privadas.

## 14. Pendiente antes de afirmar producción verificada

- [x] Build completo y 128 pruebas unitarias con Node 24.22.2 real, verificados por el revisor fuera del sandbox.
- [ ] Conexión/migraciones/seed en Neon real, respaldo y ensayo de recuperación; credenciales válidas y región real de ambas cuentas.
- [ ] Publicación y HTTPS/DNS/redirección; `/api/health` público y crons autenticados ejecutándose.
- [ ] Primer acceso administrativo en terminal del propietario y 404 de outbox en el despliegue.
- [ ] Dominio Resend verificado, recepción de un correo propio, webhook y rebotes/supresiones.
- [ ] Una respuesta real de Gemini en producción (paso 11).
- [ ] E2E del release, dos pasadas visuales reales escritorio/móvil y aceptación física en Pi/robot. Esta etapa modifica CLI/configuración y datos de seed, no la interfaz; no atribuye verificaciones visuales de etapas anteriores a este release.
- [ ] Revisión editorial de fuentes, privacidad/retenciones y responsable antes de operar con personas reales.

Los estados exactos de esta ejecución, incluidos bloqueos, están en [ARY_STAGE5_REPORT](ARY_STAGE5_REPORT.md).
