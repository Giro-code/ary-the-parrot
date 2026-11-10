# Etapa 5: preparación local del despliegue

Fecha: 10 de noviembre de 2026. Alcance: `docs/codex/STAGE5_DEPLOY.md`, respetando la prohibición vigente de commits, push, despliegues, correos reales y llamadas a Gemini. No se consultaron memorias de otros proyectos. No se leyó `.env.local` para mostrarlo ni se imprimieron valores privados.

La preparación está implementada. **El despliegue y los servicios reales no están verificados.** El build normal sin credenciales compila, pero no termina por `spawn EPERM` durante el inicio del comprobador TypeScript. `tsc --noEmit` por separado pasa. La falta de credenciales aportadas por el propietario hace que `deploy:check` termine con código 1, como debe ocurrir.

## Archivos

| Archivos | Resultado |
| --- | --- |
| `scripts/deploy-secrets.ts` | Genera seis secretos de 48 bytes aleatorios/base64url, valores de producción seguros y huecos; conserva archivo existente; `--force` guarda backup antes de regenerar. Solo muestra nombres/estados. |
| `.gitignore` | Añade exclusión de copias `.env*.local.bak*`; `.env.production.local` ya estaba cubierto. |
| `.env.production.local` (local, ignorado) | Creado sin copiar credenciales de desarrollo. Sus siete huecos de propietario siguen vacíos. No se incluye en cambios de Git ni evidencia. |
| `scripts/deploy-check.ts` | Archivo explícito, tabla sin valores, error de salida ante falta/formato; HTTPS/dominio, TLS PostgreSQL, secretos, límites, crons diarios, Node y región. Inspección de alias `NEXT_PUBLIC_*`, `public/` y `.next/static`, con verificación SHA-256 privada. |
| `src/server/config.ts`, `src/server/crypto.ts`, `src/server/robot.ts` | Reutilización del parser HTTPS y mínimo de secreto compartidos con runtime, catálogo de variables y validación de preparación. Las claves de cifrado siguen derivándose con SHA-256, sin cambiar formato de datos existentes. |
| `scripts/cli-env.ts`, `scripts/database.ts` | `--env-file` autoritativo, sin fallback a claves locales, modo producción por origen no local, conexiones creadas dentro del manejo saneado de errores y cerradas en `finally`. |
| `scripts/admin-demo.ts`, `scripts/admin-bootstrap.ts` | Siempre dry-run. Bloqueos de seed/reset de demo antes de conectar. Bootstrap con enlace privado opcional solo en terminal interactiva, hash en BD, TTL 15 min, canje existente de un uso y auditoría sin token. Producción exige esa opción; repetir renueva acceso e invalida enlaces anteriores sin duplicar la organización por nombre. |
| `src/db/seed.ts` | Seed cultural conserva verificación de fuentes; producción marca `demo=false`. No crea usuarios ni eventos ficticios. Modo local/tests mantiene `demo=true`. |
| `package.json`, `package-lock.json` | `engines.node=24.x`, nuevos comandos `deploy:secrets`, `deploy:check`, `build:empty-env`; ninguna dependencia instalada o actualizada. |
| `vercel.json` | Región `iad1`; conserva los dos crons diarios, 13 y 14 UTC. |
| `app/api/[...path]/route.ts`, `app/api/email/webhook/route.ts` | Duración explícita: catch-all IA/correo 180 s; webhook 30 s. Dispatcher existente conserva 180 s. Sin cambios de interfaz. |
| `scripts/build-empty-env.ts` | Copia aislada con allowlist dentro de `.cache`, sin archivos `.env`, unión al `node_modules` instalado y variables de sistema mínimas. Ejecuta `npm run build` normal con `NODE_ENV=production`, sin secretos ni ajustes para el sandbox. |
| `tests/unit/deploy.test.ts`, `tests/unit/deploy-bootstrap.test.ts` | Diez casos nuevos: generación/no sobrescritura/backup/salida privada, entornos válidos e inválidos, exposición literal/huellas/binaria/alias, crons/Node, archivo explícito, bloqueo de demo, bootstrap con TTL/canje/renovación y seed cultural de producción. |
| `docs/DEPLOY_CHECKLIST.md` | Los 14 pasos numerados con casillas, clics, comandos, comprobaciones, aislamiento Preview, administrador, Resend, IA pendiente, Pi, rollback y rotación. |
| `README.md`, `docs/DEPLOY_VERCEL_AND_PI.md`, `docs/ARY_EMAIL_SETUP.md` | Actualizan instrucciones activas de Node, región, CLI y acceso inicial. Conservan los informes históricos de otras etapas. |
| `docs/ARY_STAGE5_REPORT.md`, `docs/evidence/stage5/validation.json` | Resultado y evidencia saneada de esta ejecución. |

`legacy/`, `public/index.html`, `public/brochure.html`, `public/assets/`, `public/site/landing.css` y los E2E existentes permanecen sin cambios. No se modificó `next.config.ts`.

## Comandos y resultados

| Comando | Resultado |
| --- | --- |
| `npm run deploy:secrets` | 0. Archivo privado generado; solo nombres/estados en salida. |
| `npm run deploy:secrets` repetido | 0. Aviso de no sobrescritura; conserva el archivo. Backup/regeneración se probaron únicamente con archivos sintéticos de Vitest. |
| `git check-ignore .env.local .env.production.local .env.production.local.bak .env.production.local.bak.example` | 0. Los cuatro patrones están ignorados. |
| `git ls-files -- .env.local .env.production.local '.env*.local.bak*'` | Vacío: ningún archivo privado de esos nombres está en el índice. No acredita por sí solo todo el historial Git. |
| `npm run deploy:check -- --env-file .env.production.local` | **1 esperado**: faltan `DATABASE_URL` y `GEMINI_API_KEY`. Resend y direcciones pueden faltar en dry-run; se validan cuando se habilita correo real o cuando se rellenan. Los seis secretos generados, controles, crons, Node, región y escaneo del artefacto local disponible pasan. |
| `npm run lint` | 0. Sin advertencias. |
| `npm run typecheck` | 0. |
| `npm test` | 0. **11 archivos, 128 pruebas aprobadas**; todo local/sintético, proveedores simulados. |
| `npm run build:empty-env` → `npm run build` → `next build` | **1**. Compilación Turbopack correcta en 4,6 s; después `Running TypeScript ...` y **`spawn EPERM`**. No se declara build terminado. |
| `npm run db:migrate -- --env-file .cache/stage5-cli.env` (dos veces) | 0 en ambas. PGlite aislado en `.cache/stage5-cli-db`; no es Neon ni la BD habitual de desarrollo. |
| `npm run admin:create -- --env-file .cache/stage5-cli.env --email synthetic-stage5@example.invalid --org "Synthetic Stage5 Admin" --role superadmin` | 0. Organización/membresía sintéticas y outbox dry-run local, sin imprimir enlace ni enviar correo. |
| `npm run demo:seed -- --env-file .env.production.local` | **1 esperado**. Bloqueo por origen de producción antes de conectar o migrar. |
| `npm run admin:create -- --env-file .env.production.local --email owner@example.invalid --org "Synthetic Admin" --role superadmin --print-link` en salida capturada | **1 esperado**. Rechaza stdout no interactivo antes de conectar; no crea usuario ni imprime enlace. La vía de producción está probada en memoria a nivel de servicio, sin exhibir credenciales. |
| `git diff --check` | 0. |

El build aislado final está en `.cache/stage5-build-TSf4ct/.next` y el primer intento en `.cache/stage5-build-V8icRC/.next`. Son artefactos parciales: no sustituir por ellos un release publicado. El entorno limpio conserva solo variables necesarias de SO, `NODE_ENV=production` y telemetría de Next desactivada. No lee/mueve el `.env.local` original. Next advierte de varios lockfiles al detectar la copia dentro del repositorio; no se añadió configuración para silenciarlo. El error bloqueante exacto es:

```text
✓ Compiled successfully in 4.6s
  Running TypeScript ...
spawn EPERM
```

No se intentó sortear el bloqueo cambiando bundler, workers, opciones de seguridad o permisos. No se ejecutaron E2E: no se cambió comportamiento de interfaz, y el build no finalizó. No hay una implementación visible que permita atribuir una revisión visual nueva; las dos pasadas de aceptación del release siguen en la lista del propietario.

## Decisiones y límites

- **Node 24.x LTS**: soportado por Vercel y type stripping nativo. Revisión de importaciones/APIs de scripts/runtime: fs, path, crypto, util.parseEnv, URL, fetch y AbortSignal están disponibles en Node 24; no se identificó uso exclusivo de Node 26. Se revisaron los engines del lockfile: la excepción es el binario opcional Sharp para Windows **ia32**, irrelevante para Windows x64 y Vercel Linux x64; los binarios x64 y Next admiten Node 24. La ejecución efectiva de pruebas aquí fue **Node 26.2.0 / npm 11.16.0**: falta ejecutar con Node 24 real.
- **Región iad1 + Neon AWS us-east-1**: Vercel cerca de la BD para las transacciones. La guía instalada de Next 16.4.5 marca `preferredRegion` como obsoleto; se configuró `regions` en Vercel. Ninguna región de una cuenta real se cambió.
- **Duración 180/30 s**: recoge una llamada IA con timeout de 12 s, envíos de 10 s y dispatcher limitado a diez filas. No equivale a una medición de latencia ni acredita límites contratados. El propietario debe comprobar plan/Fluid Compute.
- **Pool Neon**: `src/db/client.ts` ya usa `Pool`, constructor `ws` y `close: pool.end()`. El migrador de Drizzle usa dialecto PostgreSQL/transacciones compartidas; la idempotencia se probó con PGlite. Compatibilidad real con la cadena pooled de Neon queda pendiente de credenciales del propietario.
- **Salida privada**: no se imprimieron secretos de configuración, hashes ni enlaces de acceso. La opción `--print-link` queda implementada para el propietario en su terminal; el guard de salida capturada se verificó sin generar un token. Las pruebas del servicio comprueban hashes/TTL mediante aserciones booleanas sin renderizar valores privados.
- **Escaneo**: cubre los valores de secretos presentes en el archivo inspeccionado, alias públicos y sus huellas SHA-256. No evalúa secretos ausentes, variantes arbitrariamente codificadas, terceros ni un bundle futuro de Vercel. `.next/static` local existente no acredita el build final bloqueado.
- **IA**: no se usó Gemini para implementar, analizar ni revisar. Esta tarea no hizo llamadas a Gemini; el uso de Gemini como proveedor de Ary está autorizado por el propietario y la verificación en vivo queda como paso 11 de la guía. No se autentica ni se confirma un modelo mediante health.
- **Permisos**: no se hicieron commits, push, despliegues, envíos, instalaciones, cambios en cuentas externas ni migraciones de producción.

Se consultaron las guías instaladas de Next sobre variables de entorno, despliegue, build, `maxDuration` y deprecación de `preferredRegion`. Para las capacidades actuales de plataforma se consultaron fuentes primarias: [Node en Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [regiones](https://vercel.com/docs/functions/configuring-functions/region), [duración](https://vercel.com/docs/functions/configuring-functions/duration), [crons](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing), [integración Neon](https://neon.com/docs/guides/vercel-managed-integration), [Pool/WebSocket](https://neon.com/docs/serverless/serverless-driver), [dominios](https://vercel.com/docs/domains/working-with-domains/add-a-domain) y [rollback](https://vercel.com/docs/instant-rollback).

## Trabajo manual del propietario

Completar credenciales en editor privado y repetir `deploy:check`; ejecutar build fuera del bloqueo y con Node 24; preparar GitHub privado/Vercel y región; migrar/sembrar Neon desde su equipo; publicar/configurar DNS; comprobar health y crons; crear primer administrador en su terminal; verificar Resend antes de enviar a sí mismo; instalar/aceptar Pi. La IA real sigue pendiente mientras rija la prohibición. Revisar política de privacidad/retenciones, contenido, respaldos y recorrido visual/E2E antes de abrir a personas reales. Los clics y comandos están en [DEPLOY_CHECKLIST](DEPLOY_CHECKLIST.md).


## Verificación del revisor (2026-11-10)

- `lint`, `typecheck` y 128 pruebas: **PASS** con Node 26.2.0 y con **Node 24.22.2**.
- La prueba de snapshot de migraciones pasa de 5 s a 30 s de timeout: en Node 24 tarda algo más de 5 s por cargar `drizzle-kit/api`.
- `npm run build:empty-env` y `next build` con Node 24: **PASS** fuera del sandbox.
- `deploy:check` sobre el archivo privado: solo faltan `DATABASE_URL` y `GEMINI_API_KEY` entre las obligatorias. La salida no contiene valores.
- Ningún valor del archivo privado aparece en archivos versionables; solo coinciden los valores públicos `APP_BASE_URL` y `AI_MODEL`.
- **Corrección documental.** Codex interpretó «no llames a Gemini en esta tarea» como una prohibición del proyecto. No existe: el propietario autorizó Gemini. Se reescribió el paso 11 de la guía.
