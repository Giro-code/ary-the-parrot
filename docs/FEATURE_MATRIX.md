# Funciones y evidencia · etapa 2

Trabajo local del 7 de noviembre de 2026 (archivos de evidencia en UTC del 8). Sin push, despliegue, correos reales ni uso de Gemini.

**Verificación del revisor (7 nov 2026, fuera del sandbox de Codex) — sustituye a los `BLOCKED` por `spawn EPERM` de este documento:**
- `lint`, `typecheck`, `test` (36), `build` y `test:e2e` pasan: **73 passed, 1 skipped** (regresión de la landing con 0 píxeles distintos + flujos de la etapa 2).
- E2E verificados en navegador real: kiosco A → QR → móvil B restaura exactamente → kiosco limpio → C con el mismo enlace denegado; QR caducado; cancelar; inactividad 90 s con aviso; estado sin conexión; Mi viaje; visitante sin correo.
- Prueba Pi (proxy de escritorio, CPU 4× por CDP, `next dev` en frío): carga 3,3 s y welcome → recomendaciones 1,2 s a 1280×800; 3,2 s y 1,2 s a 1920×1080. JS de entrada del kiosco: 17 KB gzip (presupuesto 200 KB). Falta medir en una Raspberry Pi 4 real.
- Ajustes del revisor a las pruebas (no a la app): selector del aviso (Next añade un `role="alert"` propio), reloj simulado instalado antes de cargar el kiosco, espera a que la sesión arranque antes de adelantar el tiempo, y salto de 20 s en lugar de 25 s para observar el estado `finished` antes de volver a `idle`.
- Sigue pendiente: validación con una instancia Neon real (`DATABASE_URL`) y en hardware Pi.

`ORIGINAL`: preservado de la base. `REAL_IMPLEMENTED`: implementación real con evidencia local indicada. `SANDBOX_ONLY`: contenido/simulador de demostración. `BLOCKED`: comprobación o infraestructura pendiente. `NOT_DONE`: fuera de esta etapa.

| Función | Estado | Evidencia y límite |
| --- | --- | --- |
| Landing: seis vistas, router, teclado, diálogos y TXT | ORIGINAL | Archivos protegidos sin diff; unitarias de preservación pasan; casos visuales originales conservados |
| Brochure y PNG | ORIGINAL | Unitarias de hashes/extracción; sin modificaciones |
| 23 tablas conceptuales, FK, índices y uniques | REAL_IMPLEMENTED | `src/db/schema.ts`, `drizzle/0000_ary_core.sql`; migrada en disco y memoria |
| Neon Pool WebSocket y transacciones | BLOCKED | Driver implementado; sin DATABASE_URL/instancia remota para validación |
| PGlite persistente/dev y memoria/tests | REAL_IMPLEMENTED | `db:migrate`, `db:seed`, `db:cleanup` y pruebas PostgreSQL reales |
| Producción sin BD → 503 y health degradado | REAL_IMPLEMENTED | Unitarias de API/health; sin fallback de producción |
| Sesión anónima hash/cookie y preferencias ES/EN | REAL_IMPLEMENTED | Pruebas API, flags de cookie y datos exactos |
| CSRF, validación, límite de payload y errores | REAL_IMPLEMENTED | Origin/Host, header, Zod, 8192 bytes, requestId; tests API |
| Rate limit persistente, sin IP en bruto | REAL_IMPLEMENTED | UPSERT en `rate_limits`, HMAC, ventana e intentos probados |
| Enrolamiento, activación única y rotación | REAL_IMPLEMENTED | CLI ejecutado; tests de uso único, expiración y credencial anterior revocada |
| QR real SVG, TTL, hash y canje transaccional | REAL_IMPLEMENTED | Tests API con `qrcode`; Promise.all: solo un ganador; rollback con fallo sintético |
| Transferencia de idioma, país, intereses y guardados | REAL_IMPLEMENTED | Pruebas de copia exacta, sesión móvil distinta y limpieza operativa del kiosco |
| Pantalla confirmatoria, QR usado/caducado y limpieza visual | BLOCKED | Implementada; ejecución E2E y dos inspecciones reales pendientes |
| Kiosco completo, offline, timeout 90 s y aviso | BLOCKED | Código y E2E escritos; no ejecutado en navegador |
| Recomendador determinista por intereses/idioma | REAL_IMPLEMENTED | Ranking/rationale/evidence persistidos; cambiar país en BD no cambia puntuación |
| Contenido cultural | SANDBOX_ONLY | 12 temas × 2 idiomas; 10 temas publicados (20 traducciones), 2 needs_source (4 traducciones); todos `demo: true` |
| Puentes culturales verificables | REAL_IMPLEMENTED | UNESCO/merengue con US/CO/VE; contexto con fuente, sin influencia en ranking |
| Respuestas de ejemplo | SANDBOX_ONLY | Texto de la ficha; sin IA ni llamadas a modelos |
| Guardados, realizado, favorito y quitar | REAL_IMPLEMENTED | Persistencia/API e IDOR probados; aceptación visual bloqueada |
| Mi viaje y QR público separado | BLOCKED | Rutas implementadas, sin PII/sesión en QR público; caso E2E preparado, navegador pendiente |
| Privacidad ES/EN | REAL_IMPLEMENTED | Aviso implementado con retención/caducidad honesta; revisión jurídica y visual pendientes |
| Limpieza física de caducados | REAL_IMPLEMENTED | CLI manual y prueba de conservación de sesión móvil vigente; sin cron desplegado |
| Eventos mínimos sin PII | REAL_IMPLEMENTED | Allowlist de claves y valores; no país, correo, IP, código ni token en analytics |
| Raspberry Pi física y hardware | NOT_DONE | UI indica Simulador; ningún dispositivo físico conectado |
| Correo / recuperación verificada / marketing | NOT_DONE | CTA separado hacia Próximamente; etapa 3 |
| Admin / proveedores / consentimiento granular | NOT_DONE | Esquemas disponibles; operación de etapa 4 |
| Publicación Vercel | NOT_DONE | No solicitada ni realizada |

## Comandos de esta ejecución

| Comando | Resultado final |
| --- | --- |
| `npm view drizzle-orm/drizzle-kit/... version` (consultas separadas) | Drizzle 0.45.4, kit 0.31.11, Neon 1.2.0, PGlite 0.5.15, Zod 4.6.7, qrcode 1.5.4 |
| Instalación dependencias | PASS con `--ignore-scripts` en herramientas: un postinstall intentó spawn y el sandbox lo rechazó |
| `npm run db:generate` | BLOCKED: `spawn EPERM` del cargador de drizzle-kit. La migración inicial se generó con su API, `node scripts/generate-migration.ts`: 86 sentencias |
| `npm run db:migrate` | PASS; segunda ejecución idempotente también PASS |
| `npm run db:seed` | PASS; 10/12 URLs verificadas, resto no publicado |
| `npm run kiosk:enroll -- --label "Demo kiosk"` | PASS; URL privada deliberadamente omitida de esta documentación |
| `npm run db:cleanup` | PASS |
| `npm run lint` | PASS; `evidence/stage2/lint.txt` |
| `npm run typecheck` | PASS; `evidence/stage2/typecheck.txt` |
| `npm test` | PASS, 36 pruebas / 5 archivos; `evidence/stage2/test.txt` |
| `npm run build` | BLOCKED tras «Compiled successfully»; «Running TypeScript ... spawn EPERM»; `evidence/stage2/build.txt` |
| `npm run test:e2e -- --list` | PASS de descubrimiento: 74 casos en dos archivos; no prueba ejecución |
| `npm run test:e2e` | BLOCKED: `Error: spawn EPERM` |
| `npm run dev` | BLOCKED: `fork` en `next-dev.js:393:45`, `errno -4048`, `syscall spawn` |
| Lanzamiento Chromium de Playwright | BLOCKED adicional: binario headless no encontrado en la caché configurada; no instalado en esta ejecución |
| `npm run check:kiosk-budget` | PASS sobre artefactos compilados: **17 317 bytes gzip** / 204 800. No acredita build completo ni carga real |
| `npm audit --omit=dev` | PASS, cero vulnerabilidades de producción |
| `npm audit` | 4 avisos moderados en dependencia antigua de esbuild del tooling drizzle-kit; sin downgrade forzado. No se inicia servidor esbuild |

Las pruebas de regresión de las seis vistas mantienen sus comparaciones/píxeles y aserciones. Solo se actualizó el contrato de las nuevas superficies de app: el aviso de etapa 2 ahora es funcional y health sin BD en producción responde 503. En el fixture se permite exclusivamente el error HTTP 503 esperado de esas APIs; los errores JS/CSP/landing continúan fallando. La cifra anterior de 65 passed/1 skipped corresponde al revisor de etapa 1; **no se volvió a verificar aquí**. Se respeta `PLAYWRIGHT_BROWSERS_PATH` existente. No se añadieron opciones experimentales de Next para rodear el sandbox.

## Raspberry Pi y cifras

| Vista | CPU | Carga | Welcome → recomendaciones | Estado |
| --- | --- | --- | --- | --- |
| 1280×800 | 4× CDP | 3,3 s | 1,2 s | Medido por el revisor (next dev en frío) |
| 1920×1080 | 4× CDP | 3,2 s | 1,2 s | Medido por el revisor (next dev en frío) |

Los casos escribirán `performance-1280.json` y `performance-1920.json`, con tiempos y bytes servidos en Next dev (compilación en frío incluida). Umbrales: carga <30 s e interacción <15 s. Son una aproximación de escritorio, pendiente de medición en Pi. El presupuesto estático de entrada de cliente es solo una parte del JS total, excluye bootstrap de Next e incluye dependencias compartidas vinculadas al kiosco. Evidencia exacta: `evidence/stage2/kiosk-budget.json`.

## Fuentes HTTP del seed

La evidencia con status, redirección final y fecha exacta está en `evidence/stage2/seed-sources.json`. Resúmenes originales ES/EN, sin imágenes ajenas, horarios, precios ni requisitos migratorios. Copyright de la fuente conservado por su editor; no se presume licencia de reproducción de imágenes.

| Tema | URL comprobada | Resultado |
| --- | --- | --- |
| Ciudad Colonial | [UNESCO World Heritage](https://whc.unesco.org/en/list/526/) | HTTP 403 desde el checker local; sourceUrl null, needs_source |
| Merengue | [UNESCO 01162](https://ich.unesco.org/en/RL/music-and-dance-of-the-merengue-in-the-dominican-republic-01162) | 200, publicada |
| Bachata | [UNESCO 01514](https://ich.unesco.org/en/RL/music-and-dance-of-dominican-bachata-01514) | 200, publicada |
| Teatro Cocolo Danzante | [UNESCO 00104](https://ich.unesco.org/en/RL/cocolo-dance-drama-tradition-00104) | 200, publicada |
| Congos de Villa Mella | [UNESCO 00006](https://ich.unesco.org/en/RL/cultural-space-of-the-brotherhood-of-the-holy-spirit-of-the-congos-of-villa-mella-00006) | 200, publicada |
| Mangú | [Ministerio de Turismo · FAQ](https://www.godominicanrepublic.com/travel/faqs) | 200, publicada |
| Larimar | [Dirección General de Minería](https://mineria.gob.do/noticias/algo-mas-que-una-piedra-semipreciosa-el-larimar/) | 200, publicada |
| Ámbar | [MUSEOSRD](https://museosrd.gob.do/museos/amber-world-museum/) | Fallo de petición HTTP; sourceUrl null, needs_source |
| Los Haitises | [Ministerio de Turismo](https://www.godominicanrepublic.com/things-to-do/national-park-los-haitises) | 200, publicada |
| Ballenas de Samaná | [Museo Nacional de Historia Natural](https://mnhn.gob.do/index.php/exhibiciones/sala-gigantes-marinos) | 200, publicada |
| Carnaval de La Vega | [Ayuntamiento Municipal](https://ayuntamientolavega.gob.do/lanzamiento-carnaval-vegano-2026/) | 200, publicada |
| Altos de Chavón | [Ministerio de Turismo](https://www.godominicanrepublic.com/things-to-do/altos-de-chavon) | 200, publicada |

## Archivos y cierre pendiente

- Datos: `src/db/{schema,client,migrate,seed,cleanup}.ts`, `drizzle.config.ts`, migración, snapshot, journal y rollback.
- Servidor: `src/server/{config,errors,tokens,http,service}.ts`; `app/api/[...path]/route.ts` y health.
- UI: `src/i18n/`, `src/components/`, `app/globals.css`, rutas kiosco/activación/experiencia/q/mi-viaje/cultura/privacidad/reingresar.
- Herramientas: `scripts/{database,e2e-server,generate-migration}.ts`, `scripts/kiosk-budget.mjs`, package/lock, entorno y configuración de tipos/Playwright/Next.
- Pruebas: `tests/unit/{api,database,health}.test.ts`, `tests/e2e/stage2.spec.ts` y adaptación documentada del contrato de app en la regresión existente.
- Documentación: README, diseño, plan actualizado, QR, matriz, revisión visual, despliegue, privacidad y evidencia.

Falta ejecutar un build completo y los 74 E2E fuera del sandbox; mirar y documentar dos pasadas visuales, completar las dos métricas de CPU y validar Neon/HTTPS/Pi si se solicita operación real. Los archivos protegidos permanecen intactos y no se hicieron commits ni push. La etapa no se declara totalmente verificada.
