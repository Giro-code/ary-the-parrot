# Etapa 4A · implementación y evidencia

Trabajo local del 7–8 de noviembre de 2026 sobre el repositorio existente. Se ejecutó `docs/codex/STAGE4A.md`, con las correcciones P0 primero y sin commit, push, despliegue ni correo real. Gemini se utilizó únicamente como proveedor de la integración de Ary, según la autorización específica de esta etapa. No se usó para implementación, delegación o revisión.

El alcance está implementado. Pasan lint, typecheck, **94 pruebas unitarias** y **15 pruebas Python**. Los **89 E2E están escritos y descubiertos**. El build compila y después se bloquea con `spawn EPERM`, excepción prevista por el criterio documental. La aceptación visual y la operación real continúan pendientes por los bloqueos indicados abajo.

## Resultado por área

| Área | Implementación y evidencia |
| --- | --- |
| Correo inmediato | Recovery, recibo B2B, aviso administrativo y confirmación de marketing se despachan después de commit por sus IDs. Reutilizan `FOR UPDATE SKIP LOCKED`, idempotencia, política y timeout HTTP de 10 s. Request-link queda dry-run/accepted sin cron y el cron posterior no duplica |
| B2B | Segundo paso integrado, casilla desmarcada, aviso 2026-11-07.v1, enlace de privacidad, foco/estado y TXT disponible. API exige `treatmentConsent=true`. Se actualizaron pruebas de landing y etapa 3 |
| Kiosco frío | Comprobando al inicio, dispositivo desconocido hasta respuesta de me, timeout y backoff offline de 1/2/4/8/15 s |
| IA | AiProvider/Gemini/Demo, clasificación previa de temas sensibles, contexto publicado por idioma/intereses, instrucciones y datos separados, JSON/Zod, citas restringidas y texto plano con fuentes |
| Controles | 500 caracteres, 20 preguntas/sesión, límites persistentes por minuto y globales, timeout 12 s y 768 tokens de salida. ai_usage sin texto/identidad de visitante |
| Historial | Cifrado por sesión, restauración en móvil al recargar, TTL igual a expiresAt, borrado al terminar/canjear/recuperar y protección ante respuestas tardías. Filas legacy vacías/malformadas se omiten de forma segura |
| Robot cloud | HMAC de bytes exactos, dispositivo activado/vigente, timestamp ±60 s, nonce único, deduplicación eventId, 503 sin secreto, mantenimiento secundario rest/stop y ninguna API pública de inserción de comandos |
| Puente local | SSE + POST de stdlib, 127.0.0.1:8765, Host/Origin/token HMAC de 120 s, allowlist, límites y presencia sin iniciar sesión. Adaptadores Mock/Hardware y estado honesto del kiosco |
| Pi | Telemetría HTTPS saliente, cola SQLite duradera y acotada, simulador, protocolo serie/ACK con fallo enclavado, systemd y firmware de referencia para cuatro servos con límites/suavizado/watchdog/PIR |
| Conservación | Sin diff en legacy, public/index.html, brochure, PNG ni CSS de landing. Pruebas de hashes y extracción pasan. La regresión de 0 píxeles sigue pendiente de ejecutar en navegador |

La voz, el micrófono y conservar o transferir conversaciones entre sesiones requieren una autorización específica posterior. El QR mantiene la continuidad de idioma, intereses y guardados del contrato existente. Admin/CMS/partner pertenecen a etapa 4B.

## Migración

`drizzle/0002_stage4a_ai_robot.sql`, snapshot `drizzle/meta/0002_snapshot.json` y journal actualizado. Añade `ai_usage`, `robot_events` y `robot_commands`, con índices, FK y restricción de mantenimiento. Hay 29 tablas. Rollback de pruebas en `drizzle/rollback/0002_stage4a_ai_robot.sql`.

Se generó mediante la API instalada de Drizzle con `node scripts/generate-stage4a-migration.ts`. Las pruebas aplican migraciones PostgreSQL reales en PGlite, comparan snapshot/esquema y comprueban rollback completo. El CLI migrate se ejecutó dos veces y cleanup una vez sobre `.cache/ary-stage4a-cli-check`, separado de la BD habitual. También se eliminaron parameter properties de los proveedores de email para que sus importaciones funcionen con el strip-only de Node 26 usado por el CLI.

## Variables

`.env.example` contiene placeholders privados y valores de control. Variables de esta etapa `GEMINI_API_KEY`, `AI_MODEL=gemini-3.8-flash`, `AI_SESSION_PER_MINUTE=6`, `AI_GLOBAL_PER_MINUTE=30`, `ROBOT_DEVICE_AUTH_SECRET`, `ROBOT_BRIDGE_SECRET` y `ROBOT_DEVICE_ID` solo en la Pi. Se conservan las variables de BD, privacidad, correo, origen, TTL y finalidades de las etapas anteriores. Los secretos de robot son distintos y exigen al menos 32 caracteres.

## Peticiones reales a Gemini

Tres peticiones autenticadas en total. Una consultó modelos y confirmó alternativas Flash disponibles. Dos intentaron una generación corta sobre contenido público del seed y una sesión temporal en memoria.

| Modelo | Latencia del pipeline | Salida del proveedor validada | Resultado |
| --- | --- | --- | --- |
| gemini-3.6-flash | 1724 ms | No | provider_http_error, clasificador inicial genérico |
| gemini-3.6-flash | 1880 ms | No | HTTP 503 UNAVAILABLE, provider_http_503 |

Ambas activaron demo. Después se contrastó la ficha oficial de 3.8, estable y más reciente, y se cambió el predeterminado a `gemini-3.8-flash`. No se generó con ese modelo porque el máximo autorizado ya estaba consumido. La integración real y la configuración final requieren comprobación posterior. Evidencia en `evidence/stage4a/live-ai-attempt1.json` y `live-ai.json`. No se imprimió ni registró la clave. [Pipeline y referencias oficiales](ARY_AI.md).

## Comandos y resultados

| Comando | Resultado observado |
| --- | --- |
| `node scripts/generate-stage4a-migration.ts` | PASS, ocho sentencias SQL, snapshot/journal |
| `npm run db:migrate`, dos ejecuciones aisladas | PASS, idempotencia |
| `npm run db:cleanup`, BD aislada | PASS |
| `npm run lint` | PASS, cero warnings |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 94 pruebas en siete archivos |
| `python -m unittest -v`, desde pi | PASS, 15 pruebas, incluidas HTTP/SSE, firma, token, origen, allowlist, rate limit, cola, simulador y ACK |
| `npm run build` | Compilación correcta en 3,1 s. Después `Running TypeScript ... spawn EPERM`, exit 1 |
| `npm run check:kiosk-budget` | PASS, 20 582 bytes gzip / 204 800 sobre chunks compilados, excluye bootstrap y no certifica carga de Pi/build completo |
| `npm run test:e2e -- --list` | PASS, 89 casos en cuatro archivos, ocho nuevos de etapa 4A |
| `npm run test:e2e -- --project=stage4a` | BLOCKED, `Error: spawn EPERM` antes de ejecutar casos |
| `npm run dev` | BLOCKED, `Error: spawn EPERM`, errno -4048, syscall spawn, next-dev.js:393:45 |
| Inventario de navegador CUA | BLOCKED, `Browsers: The browser access host is unavailable` |
| `git diff --check` | PASS |

Los logs finales y el inventario están en `docs/evidence/stage4a/`. La medición del presupuesto se copió allí y se restauró la evidencia histórica de etapa 2. Tampoco se conservaron cambios incidentales de next-env. Las pruebas automáticas usan fetch simulado y el fixture E2E fuerza clave vacía/correo dry-run.

## Archivos

Inventario completo en [files.json](evidence/stage4a/files.json). Grupos principales de código y documentación.

- `src/server/ai/{providers,chat}.ts`, `src/server/robot.ts` y nuevas rutas `app/api/{kiosk/bridge-token,robot/events,robot/commands}/route.ts`.
- `src/server/{auth,commercial,http,stage3-http}.ts`, email outbox/proveedores, catch-all API y health.
- `src/db/{schema,cleanup}.ts`, migración 0002, snapshot, journal y rollback.
- `src/components/{ary-chat,use-robot,kiosk,experience,information,api}` y `src/robot/{protocol,hardware}.ts`, estilos de aplicación y bloque final del formulario en `public/site/landing.js`.
- `pi/ary_robot.py`, `pi/bridge/`, pruebas Python, firmware, servicios systemd y README.
- `tests/unit/stage4a.test.ts`, E2E de etapa 4A, ajustes de pruebas anteriores, fixture, CSP y placeholders.
- `scripts/{generate-stage4a-migration,verify-ai}.ts`, README, ARY_AI, despliegue, matriz, plan, seguridad, correo y revisión visual.

## Bloqueos y límites

Las dos pasadas visuales reales de escritorio/móvil y la comparación final de 0 píxeles permanecen pendientes. Los E2E producen evidencia futura, cuya generación deberá acompañarse de inspección real. No se atribuyen resultados visuales a revisión de código. [Registro visual](VISUAL_REVIEW.md).

Las pruebas de firmware, servos, PIR, arranque de Pi, calibración y políticas de Chromium necesitan hardware real. El código Python y el sketch son referencias, con esos límites explícitos. Neon, correo real y el despliegue publicado tampoco se validaron en esta ejecución.

Las dos generaciones reales fallaron. Los mocks verifican el comportamiento de la integración, la validación y el fallback. La clasificación por patrones puede omitir paráfrasis, y una cita válida requiere evaluación semántica/editorial adicional. La revisión jurídica de datos y proveedores continúa pendiente antes de producción.

Se mantuvo el sandbox y las configuraciones normales de ejecución. No hubo instalación de herramientas, apertura de servidores públicos ni cambios de opciones para eludir los bloqueos.

## Verificación del revisor (2026-11-08)

Ejecutado fuera del sandbox, sobre el árbol final:

- `lint`, `typecheck`, `npm test` (94) y `npm run build`: **PASS**. El build completa, sin `spawn EPERM` fuera del sandbox.
- `python -m unittest` en `pi/`: **PASS** (15).
- Playwright: **88 pasan y 1 se omite**. Incluye la regresión de 0 píxeles de la landing y las dos pasadas visuales de 4A. Hubo tres correcciones de pruebas, ninguna de producto:
  - El servidor del puerto 3000 migra la PGlite antes de arrancar. Una base vieja sin `ai_usage` hacía que health devolviera `degraded`.
  - La prueba de kiosco en frío retiene también el segundo chequeo. El estado «Sin conexión» dura unos 1 s y el sondeo de Playwright podía no verlo.
  - La regresión `app` corre en producción sin BD y ahora espera «Sin conexión al servicio». El kiosco ya no afirma «Modo demostración sin dispositivo» cuando no pudo comprobar el dispositivo. Es el comportamiento correcto.
- Escaneo de secretos: ninguna clave de Gemini en el repositorio ni en el log de Codex. No hay `NEXT_PUBLIC_*` y los archivos protegidos no tienen diff.
- Gemini en vivo con `gemini-3.8-flash`. Una prueba directa devolvió **200 con texto**, así que la clave y el modelo son válidos. El servicio de Google estaba saturado durante la revisión: devolvió 503 y llegó a tardar 87 s. `verify-ai --live` cayó en demo (503 y luego timeout de 12 s), que es el comportamiento esperado. Se añadió `thinkingConfig.thinkingLevel = "low"`, aceptado por la API, para reducir latencia. **Pendiente:** repetir `node scripts/verify-ai.ts --live` cuando el servicio esté estable.
- Sin validar: Neon real, Pi física y firmware en un Arduino real.
