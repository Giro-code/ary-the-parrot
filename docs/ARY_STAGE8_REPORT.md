# Etapa 8 · rediseño cultural, correo y conversaciones

Ejecución local del 10 de noviembre de 2026. **Implementación realizada; cierre visual/E2E bloqueado por el entorno.** No se hicieron commits, push, despliegues, correos reales, instalaciones ni llamadas reales a Gemini. Se ignoraron memorias de otros proyectos y `outputs/`. `legacy/` permanece intacto.

## Resultado

- Chat compartido con avatar de 64 px móvil / 88 px escritorio y 112 px en kiosco grande. Sin título grande ni «Idioma: ES». Cabecera con SVG de viajes/conversaciones, selector EN/ES y menú de sesión. Altura `100dvh`, una región principal de mensajes, columna útil de 760 px, entrada inferior con área segura y textos legales finos. Estados de voz, imágenes, permisos, inactividad y offline conservados.
- Bienvenida ES/EN en `/experiencia`: Ary saludando, sobre SVG propio con sello de cotorra/ola, correo, términos/privacidad obligatorios sin marcar y marketing opcional sin marcar. Explica seguimiento/historial y cinco preguntas antes de verificar. El adaptador efectivo dry-run se muestra honestamente. Una sesión verificada evita el formulario.
- `/api/auth/start` reutiliza enlace mágico/outbox. Admisión y cupo se comprueban también en APIs de texto/voz. Cinco preguntas por HMAC de correo durante 24 h, compartidas entre sesiones, contador atómico; límites existentes por IP, cuenta de correo y sesión/global conservados. No se añadió bloqueo de dominios desechables: era opcional. Cuenta solo después de verificar. Consentimientos `terms`, `conversation_history`, `marketing`, aviso `2026-11-10.v2`, fuente/prueba/fecha. Marketing exige DOI separado; no activa campañas por verificar acceso. Se impide revivir una petición de marketing retirada mediante un enlace anterior.
- `/terminos` ES/EN muestra **Borrador pendiente de revisión legal**. Uso permitido, errores de IA, límites sobre viajes/vuelos y temas sensibles, menores supervisados y marcadores de responsable/contacto; sin razón social inventada.
- Intenciones `general` y `directions`. General usa conocimiento no específico del modelo, sin citas, etiqueta propia y controles de cifras/monedas/horarios/URLs/HTML. Cultura requiere fuente/cita/confianza. Historial seguro incluye turnos generales para seguir la conversación; excluye derivaciones sensibles/inyección. Sin proveedor/salida válida hay fallback honesto y ficha relacionada si existe. `ai_usage` sigue sin texto.
- Direcciones ES/EN: QR automático dentro del chat solo en dispositivo público activado; dos dígitos, caducidad/canje único y Ary mostrando. En web ofrece guardar, sin QR privado. La ubicación se muestra solo desde datos de una ficha. Los destinos sin ficha se guardan cifrados a partir del texto del visitante y se identifican como no verificados, sin mapas/rutas inventados.
- QR ahora conserva mensajes y destinos además de preferencias/fichas. El teléfono pide correo antes de continuar. La verificación del enlace ya no destruye los mensajes al fusionar sesiones. La demo sin activación sigue siendo determinista: no puede emitir QR ni llamar a IA/TTS.
- «Mis viajes» / «My trips», «Mis conversaciones» / «My conversations» con SVG. Historial cifrado de cuentas verificadas con consentimiento: lista por fecha/primer mensaje, abrir, continuar, borrar. Privacidad/exportación/borrado de cuenta y cron incluyen conversaciones y lugares. Retirar historial purga snapshots y mensajes operativos actuales; no recupera datos ya borrados al volver a autorizar.
- Landing cultural estática ES/EN: fotografías dominicanas, papel cálido/verde profundo, tipografía editorial y olas SVG propias. Hero «Habla con Ary» / «Talk to Ary», Ary y burbuja enlazados a la experiencia, animación con reduced-motion. Flechas de texto sustituidas por SVG, sin mención visible al kiosco. Se conservan secciones, demo, presentación, selector y B2B/TXT/consentimiento/envío. Brochure original sigue enlazado como pieza imprimible. Las pruebas de igualdad de píxeles se sustituyen por comportamiento funcional; hashes históricos siguen verificados.

## Migración y variables

`drizzle/0004_stage8_conversations.sql`: 12 sentencias, nuevas tablas `conversations` y `saved_places`, índices de propietario/retención y restricciones, campos `visitor_sessions.pending_email_hash` y `conversation_id` con FK. Snapshot `0004_snapshot.json`, journal y rollback de pruebas. Generación, migración sobre PGlite en memoria, comparación de snapshot y rollback completo probados. **No se migró la BD de producción ni se ejecutó el rollback fuera de pruebas.**

Variable nueva: `CONVERSATION_RETENTION_DAYS=90`, mínimo 1 y máximo 365. Se reutilizan `SESSION_ENCRYPTION_KEY`, `AUTH_SECRET`, `RATE_LIMIT_SALT`, variables de Resend, claves de IA y los cron existentes. No se cambia ninguna clave privada ni se imprime su valor. No hay dependencia nueva ni framework en la landing.

## Imágenes y créditos

| Lugar / archivos WebP y variante -640 | Autor / licencia verificada |
| --- | --- |
| Catedral de Santo Domingo · `catedral` | Ulises Jorge, [CC BY 2.0](https://commons.wikimedia.org/wiki/File:Catedral_Santo_Domingo.jpg) |
| Manglar de Los Haitises · `haitises` | Rachel Docherty, [CC BY 2.0](https://commons.wikimedia.org/wiki/File:Los_Haitises.jpg) |
| Altos de Chavón · `chavon` | Captain-tucker, [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Altos_de_Chavon-2.JPG) |

Descargadas solo de Wikimedia Commons; inspeccionadas en visor. La catedral se recorta a 1280×700 para excluir personas en primer plano; las otras imágenes tienen como máximo 1600 px. WebP, variantes de 640, dimensiones, srcset/sizes, lazy en las fotos fuera del hero y créditos visibles con autor, licencia, enlaces y transformaciones. El hero usa prioridad de carga. [Tabla completa de créditos](IMAGE_CREDITS.md). No se realizaron mediciones LCP reales por el bloqueo de navegador.

## Validación y bloqueos

| Comando / comprobación | Resultado |
| --- | --- |
| `node scripts/generate-stage8-migration.ts` | 12 sentencias generadas; no modifica producción |
| `node scripts/stage8-images.mjs` | 6 WebP optimizados; originales Ary/legacy conservados |
| `npm run lint` | PASS, sin advertencias |
| `npm run typecheck` | PASS, `tsc --noEmit` |
| `npm test` | 193 pruebas / 18 archivos pasan; proveedor/correo simulados |
| `npm run build` | EXIT 1: compilación Turbopack correcta, después `Running TypeScript ...` → `spawn EPERM` |
| `npx playwright test --list --project=stage8 --project=stage8-webkit` | PASS, 8 casos encontrados; listar no es ejecutar |
| `npx playwright test --list` | PASS, inventario de 69 casos / 8 archivos |
| `git diff --check` | PASS |
| `npx playwright test --project=stage8 --project=stage8-webkit --workers=1` | EXIT 1: `Error: spawn EPERM`, antes de ejecutar pruebas |
| Navegador integrado | `The browser access host is unavailable` |

Las unitarias incluyen clasificación, general sin cita/cultura sin cita/sensible con proveedor simulado, cuota concurrente por correo, límites de IP/enlace, consentimientos, rollback al fallar solicitud, cifrado, propiedad, apertura/continuación, retención/cron, borrado/retirada, marketing/DOI/retirada pendiente, QR con conversación/destino y markup bilingüe. El JS ES/EN conserva la misma estructura AST e identificadores; se comparan argumentos de etiquetas/selectores/atributos/eventos y se comprueban enlaces/API/payloads. Solo se cambiaron textos visibles y versión del aviso.

Playwright principal ya integraba etapa 7 cuando comenzó esta tarea; no existía la segunda configuración mencionada por la instrucción. Se conserva esa integración y se añaden stage8/Chromium y stage8-webkit, usando servidores 3000 y 3002. Se retira el servidor/proyecto de comparación legacy y se respeta la instalación de navegadores existente. No se alteró configuración de Next ni permisos para sortear el sandbox.

**No se acredita ejecución E2E, capturas finales, ausencia real de overflow, Safari iOS/Chrome Android físicos, LCP ni dos pasadas visuales.** El plan de capturas existe en `tests/e2e/stage8.spec.ts`; ambas revisiones reales siguen pendientes. Ver [registro visual](evidence/stage8/visual-review.md) y [carpeta de capturas](screenshots/stage8/README.md). No se han fabricado capturas ni resultados. Logs locales acotados en `.cache/stage8-*.log`, ignorados por Git. Runtime disponible: Node 26.2.0; el repositorio prescribe Node 24.x. No se instaló otra versión.

## Correo real observado y activación posterior

GET público a `https://arytheparrot.app/api/health` el 2026-11-10 a las 17:07:14 UTC: HTTP 200, base conectada, correo `configured_unverified`. Difiere del snapshot dry-run de la instrucción; **no prueba entrega**. El conector Vercel de esta sesión no lista el proyecto de Ary; no se inspeccionaron valores privados. [Evidencia saneada](evidence/stage8/production-email-status.json).

El propietario debe revisar el proyecto correcto, verificar el dominio de envío en Resend/DNS, configurar `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DRY_RUN=false`, webhook firmado y claves existentes estables, aplicar la migración tras revisión y, solo cuando autorice publicar, hacer un nuevo despliegue. Posteriormente podrá validar un buzón controlado, enlace único, webhook y cron. **Ningún paso de publicación ni envío real se ejecutó aquí.** Los pasos exactos, pantallas, eventos y comandos están en [ARY_EMAIL_SETUP](ARY_EMAIL_SETUP.md).

## Archivos

El inventario exhaustivo de cambios de esta tarea se adjunta debajo. Se preservó sin tocar `docs/codex/STAGE8B_UX_POLISH.md`, que apareció como archivo ajeno durante la ejecución; no se ejecutó otra etapa.

- `.env.example`
- `app/api/[...path]/route.ts`
- `app/api/voice/ask/route.ts`
- `app/experiencia/page.tsx`
- `app/layout.tsx`
- `app/mis-conversaciones/page.tsx`
- `app/stage8.css`
- `app/terminos/page.tsx`
- `docs/ARY_AI.md`
- `docs/ARY_EMAIL_SETUP.md`
- `docs/ARY_SECURITY_AND_PRIVACY.md`
- `docs/ARY_STAGE8_REPORT.md`
- `docs/evidence/stage8/checks.json`
- `docs/evidence/stage8/production-email-status.json`
- `docs/evidence/stage8/visual-review.md`
- `docs/IMAGE_CREDITS.md`
- `docs/LEGACY_REGRESSION.md`
- `docs/PRIVACY_COMPLIANCE_REVIEW.md`
- `docs/screenshots/stage8/README.md`
- `docs/STAGE8_DESIGN.md`
- `drizzle/0004_stage8_conversations.sql`
- `drizzle/meta/_journal.json`
- `drizzle/meta/0004_snapshot.json`
- `drizzle/rollback/0004_stage8_conversations.sql`
- `playwright.config.ts`
- `public/assets/places/catedral.webp`
- `public/assets/places/catedral-640.webp`
- `public/assets/places/chavon.webp`
- `public/assets/places/chavon-640.webp`
- `public/assets/places/haitises.webp`
- `public/assets/places/haitises-640.webp`
- `public/en/index.html`
- `public/index.html`
- `public/site/cultural.css`
- `public/site/landing.en.js`
- `public/site/landing.js`
- `README.md`
- `scripts/e2e-server.ts`
- `scripts/generate-stage8-migration.ts`
- `scripts/stage8-images.mjs`
- `src/components/account-privacy.tsx`
- `src/components/ary-chat.tsx`
- `src/components/ary-stage.tsx`
- `src/components/conversations.tsx`
- `src/components/email-welcome.tsx`
- `src/components/experience.tsx`
- `src/components/icons.tsx`
- `src/components/information.tsx`
- `src/components/kiosk.tsx`
- `src/components/locale-provider.tsx`
- `src/components/public-culture.tsx`
- `src/components/shared.tsx`
- `src/components/terms.tsx`
- `src/components/trip.tsx`
- `src/components/types.ts`
- `src/components/verify-link.tsx`
- `src/components/voice-shell.tsx`
- `src/db/cleanup.ts`
- `src/db/schema.ts`
- `src/i18n.ts`
- `src/i18n/ui.ts`
- `src/location.ts`
- `src/privacy.ts`
- `src/server/ai/chat.ts`
- `src/server/ai/providers.ts`
- `src/server/ai/safety.ts`
- `src/server/ai/voice.ts`
- `src/server/auth.ts`
- `src/server/consents.ts`
- `src/server/conversations.ts`
- `src/server/email/outbox.ts`
- `src/server/email/templates.ts`
- `src/server/onboarding.ts`
- `src/server/places.ts`
- `src/server/privacy.ts`
- `src/server/service.ts`
- `src/server/stage3-http.ts`
- `tests/e2e/legacy-regression.spec.ts`
- `tests/e2e/stage2.spec.ts`
- `tests/e2e/stage3.spec.ts`
- `tests/e2e/stage4b.spec.ts`
- `tests/e2e/stage6.spec.ts`
- `tests/e2e/stage7.spec.ts`
- `tests/e2e/stage8.spec.ts`
- `tests/e2e/stage8-helpers.ts`
- `tests/e2e/voice-helpers.ts`
- `tests/e2e/warmup.ts`
- `tests/unit/database.test.ts`
- `tests/unit/language-render.test.tsx`
- `tests/unit/legacy.test.ts`
- `tests/unit/stage6.test.ts`
- `tests/unit/stage8.test.ts`
- `tests/unit/stage8-ui.test.tsx`

## Verificación del revisor (2026-11-10), etapas 8, 8B y 8C

- `lint`, `typecheck`, 193 pruebas unitarias y `build`: **PASS**.
- Playwright: **69/69 pasan**, incluido WebKit (iPhone). La regresión de píxeles contra legacy se retiró a petición del propietario: la landing se rediseñó y `legacy/` se conserva sin cambios.
- Migración `0004_stage8_conversations` aplicada en Neon de producción.
- **Correcciones del revisor:**
  - **Codificación.** Codex cortó la etapa 8B a mitad por límite de uso, y unas escrituras PowerShell→python habían convertido «ó ¡ ¿ …» en «?» en `recovery.tsx` y `email-welcome.tsx`. Restaurado.
  - **CSS que faltaba** para las pantallas de cuenta y correo y para la barra compacta del chat: Ary gigante, pasos sin estilo y micrófono en otra fila. Añadido en `app/globals.css`, y quitada la numeración duplicada de los pasos.
  - **Términos.** `consumeProvisionalQuestion` dejaba seguir chateando a quien retiró los términos si tenía consentimiento de recuperación. Ahora la retirada bloquea, y solo se admite a quien llega por recuperación sin registro de términos.
  - **Estado del robot.** `onPause`/`onEnded` del audio ponían a Ary en `idle` mientras grababa o procesaba. Corregido.
  - **Fichas.** Los resúmenes se cortaban a mitad de palabra; ahora terminan en palabra completa con «…».
  - **`/reingresar`.** Usa `window.location.replace` en lugar de `useRouter`, porque el render en servidor de la prueba unitaria no monta el router.
- Pruebas ajustadas al diseño nuevo: alerta filtrada; el QR del kiosco pausa el campo a propósito.
