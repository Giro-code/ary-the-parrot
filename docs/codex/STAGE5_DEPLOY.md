# Codex — Etapa 5: preparación del despliegue (Vercel + Neon + Resend + Gemini)

Sigues en `D:\Ary The Parrot`. Las etapas 1–4B están hechas, verificadas por el revisor y commiteadas. Lee primero:

- `README.md`
- `.env.example`
- `docs/DEPLOY_VERCEL_AND_PI.md`
- `docs/ARY_EMAIL_SETUP.md`
- `docs/ARY_AI.md`
- `vercel.json`
- `next.config.ts`
- `src/db/client.ts`
- `scripts/database.ts`
- `scripts/admin-demo.ts`

Antes de tocar config de Next, lee la guía relevante en `node_modules/next/dist/docs/`.

**Objetivo.** Que el despliegue en Vercel con dominio `arytheparrot.app` sea reproducible y seguro. El propietario lo hará desde la web: GitHub ya está conectado a Vercel y no hay CLI de `gh` ni de `vercel` en la máquina. No despliegas nada.

## Restricciones

- No hagas commits, push ni despliegues. No envíes correos reales. No llames a Gemini.
- **Nunca imprimas el valor de ningún secreto**: ni en stdout, ni en logs, ni en docs, ni en tests. Esto incluye `.env.local`, que contiene la clave real de Gemini; no la leas para mostrarla.
- No toques `legacy/`, `public/index.html`, `public/brochure.html`, `public/assets/` ni `public/site/landing.css`.
- Ignora memorias de otros proyectos.
- No metas rodeos de sandbox en la configuración. Si algo falla por `spawn EPERM`, documenta el error exacto.

## 1. Generador de secretos

**Comando:** `npm run deploy:secrets`

- Crea `.env.production.local`. Ya está gitignorado por `.env*.local`; verifícalo con `git check-ignore`.
- Contenido:
  - Secretos aleatorios fuertes con `crypto.randomBytes`, en el formato que espera `src/server/config.ts` (revisa longitudes y codificación): `AUTH_SECRET`, `SESSION_ENCRYPTION_KEY`, `CRON_SECRET`, `RATE_LIMIT_SALT`, `ROBOT_DEVICE_AUTH_SECRET` y `ROBOT_BRIDGE_SECRET`.
  - Valores de producción no secretos: `APP_BASE_URL=https://arytheparrot.app` y `EMAIL_DRY_RUN=true`. La primera vez se despliega en modo prueba de correo y se cambia a `false` tras verificar Resend.
  - Flags en `false`, retención y TTL según `.env.example`.
  - Huecos vacíos con comentario para lo que aporta el propietario: `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFICATION_EMAIL` y `GEMINI_API_KEY`.
- **Comportamiento:**
  - Si el archivo existe, **no lo sobrescribe**; sale con un aviso. Con `--force`, hace antes una copia `.bak`, también ignorada.
  - Imprime solo los **nombres** de las variables y cuáles faltan, nunca los valores.
- **Formato.** Pegable en Vercel: Settings → Environment Variables → «Import .env».

## 2. Comprobación previa al despliegue

**Comando:** `npm run deploy:check [-- --env-file .env.production.local]`

Carga ese archivo sin imprimir valores y valida con la misma lógica de `config.ts` que usará producción. Informa en una tabla de **nombre → OK / falta / formato inválido**.

**Comprobaciones:**

- **URL y base de datos.** `APP_BASE_URL` es https y su host coincide con `arytheparrot.app`. `DATABASE_URL` tiene forma `postgres(ql)://` y `sslmode=require` o equivalente de Neon.
- **Secretos.** Cada uno cumple la longitud mínima y los secretos de robot son distintos entre sí.
- **Exposición.** Ningún secreto aparece en `NEXT_PUBLIC_*`, en `public/` ni en `.next/static`. Para esto último, si existe un build, busca las huellas: hash SHA-256 de cada valor comparado contra el contenido de los archivos; no compares el texto en claro en la salida.
- **Crons.** `vercel.json` tiene crons diarios dentro del límite de Hobby.
- **Node.** `engines.node` en `package.json` es compatible con Vercel.

Sale con código ≠ 0 si falta algo obligatorio.

**Prueba Vitest:** un archivo de entorno sintético que valida bien y otro que falla. Comprueba también que la salida nunca contiene los valores.

## 3. Versión de Node y build en Vercel

- **Versión de Node.** Fija `engines.node` a una línea LTS que Vercel soporte: `24.x` si nada exige Node 26. Los scripts `node scripts/*.ts` usan type stripping nativo, que funciona en Node ≥ 22.18 y 24.
  - Comprueba que no se usan APIs exclusivas de Node 26.
  - Documenta la decisión.
- **Build.** `npm run build` no debe necesitar `DATABASE_URL` ni secretos. Si los necesita, corrígelo para que la página se renderice en petición y no en build. Compruébalo con un entorno vacío.
- **Funciones.** Revisa `maxDuration` y la región en las rutas que hablan con Gemini y Resend. Las funciones deberían estar cerca de Neon; documenta que se elija la misma región, por ejemplo `iad1` con Neon `us-east-1`. No inventes valores de plan.

## 4. Migraciones y primer administrador contra Neon

- **Migraciones.** `npm run db:migrate` debe funcionar contra Neon con `DATABASE_URL` real, ejecutado **desde la máquina del propietario**, no en el build de Vercel.
  - Añade un modo `--env-file .env.production.local` a `scripts/database.ts` y a `scripts/admin-demo.ts`, o documenta cómo exportar la variable en PowerShell, sin que el valor quede en el historial si es posible.
  - Confirma que con Neon usa el cliente Pool o WebSocket correcto y que cierra la conexión.
- **Primer administrador.** `npm run admin:create -- --email <correo> --org "Ary Admin" --role superadmin` contra producción.
  - En producción, el enlace de acceso **no** aparece en `/dev/outbox`, que da 404 en prod.
  - Revisa qué pasa con `EMAIL_DRY_RUN=true` en producción: ¿cómo obtiene el primer admin su enlace? Si no hay forma segura, añade una opción `--print-link` en el CLI que lo imprima **solo en la terminal local del propietario**, con TTL de 15 min y un aviso. Documenta el riesgo.
- **Seed.** `db:seed` contra producción carga el contenido cultural real verificado. `demo:seed` **nunca** debe ejecutarse en producción: bloquéalo si `APP_BASE_URL` no es local, salvo con `--i-know-this-is-production-demo`.

## 5. Guía para el propietario

**Archivo:** `docs/DEPLOY_CHECKLIST.md`, en español sencillo, con pasos numerados y casillas. Cada paso dice dónde hacer clic y cómo comprobar que salió bien:

1. Crear un repositorio **privado** en GitHub y subir la rama `main`, con los comandos exactos de `git remote add` / `git push`. Antes, confirmar que `.env.local` y `.env.production.local` no están en git.
2. Vercel → Add New Project → importar el repositorio. Framework Next.js, comandos por defecto.
3. Neon desde Vercel → Storage / Marketplace → Neon, o una cuenta Neon directa:
   - Región.
   - Copiar la `DATABASE_URL` pooled.
   - Qué hace la integración con las variables automáticamente.
4. `npm run deploy:secrets`, completar los huecos y `npm run deploy:check`.
5. Importar las variables en Vercel solo para el entorno Production. Explica Preview: o no se despliega o lleva BD aparte, para que nunca use la BD de producción.
6. Migrar y sembrar Neon desde local.
7. Primer despliegue y dominio:
   - Settings → Domains → `arytheparrot.app` y `www` con redirección.
   - Registros DNS si el dominio está en Vercel.
8. Comprobar `https://arytheparrot.app/api/health`: base de datos `connected`, correo en `dry_run` e IA `configured_unverified`.
9. Crear el primer administrador.
10. Resend:
    - Dominio verificado y remitente `EMAIL_FROM`.
    - Webhook a `/api/email/webhook` y su secreto.
    - Cambiar `EMAIL_DRY_RUN=false` y redeploy.
    - Probar enviándose un correo a sí mismo.
11. Gemini: `node scripts/verify-ai.ts --live` en local o una pregunta desde `/experiencia`.
12. Kiosco:
    - Generar el enlace de activación desde `/admin/dispositivos`.
    - Configurar la Pi según `DEPLOY_VERCEL_AND_PI.md`.
13. Cómo revertir:
    - Instant Rollback de Vercel.
    - Rollback de migraciones en `drizzle/rollback`, con su advertencia de pérdida de datos.
    - Cómo rotar cada secreto.
14. Lista de lo que **no** está verificado en producción.

## 6. Pruebas

- Vitest para `deploy:secrets` y `deploy:check`:
  - No sobrescribe.
  - Nunca imprime valores.
  - Detecta un secreto corto o una URL http.
- `lint`, `typecheck`, `test` y `build`, con un entorno de producción vacío para el build.
- No toques los E2E existentes salvo que algo cambie de comportamiento.

## Criterio de terminado

- Los comandos funcionan.
- Las pruebas pasan, o queda documentado el error exacto del sandbox.
- La guía está completa.
- Al terminar, imprime: archivos, comandos con resultado, decisiones (Node y región) y lo que el propietario debe hacer a mano.
