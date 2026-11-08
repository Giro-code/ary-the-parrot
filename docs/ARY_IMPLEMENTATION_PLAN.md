# Plan de implementación de Ary

Etapas 1 y 2. Fecha de trabajo 7 de noviembre de 2026. El inventario y cierre de etapa 1 se conservan como historial; el estado actual de etapa 2 está al final y en `FEATURE_MATRIX.md`. Sin commit ni push durante etapa 2. Se preserva trabajo ajeno, incluido `.claude/launch.json` aparecido durante la sesión.

## Inventario inicial

| Elemento | Estado | Evidencia |
| --- | --- | --- |
| Landing, brochure, dos PNG y LEEME | EXISTS | `legacy/` y `legacy/SHA256SUMS` |
| Router hash, demo, presentación y solicitud TXT | EXISTS | HTML y JS originales, pendientes de regresión propia |
| Next.js, TypeScript, API y pruebas | MISSING | Ausencia de `package.json` y código de aplicación |
| Kiosco, sesión, QR y experiencia móvil | MISSING | Etapa 2 |
| BD Neon y credenciales de servicios | BLOCKED | Infraestructura futura, sin claves reales |
| Correo, consentimientos y solicitud B2B persistida | MISSING | Etapa 3 |
| Admin, partner, analítica y robot conectado | MISSING | Etapa 4 |

## Diseño mínimo antes de implementar

El objetivo es conservar la presentación comercial y abrir una entrada secundaria a la futura experiencia del visitante. Se mantienen sus seis vistas, su jerarquía, sus textos, imágenes y controles. La única adición visible será un enlace secundario en el inicio. `/experiencia` y `/kiosco` identificarán con claridad su disponibilidad en la etapa 2 y permitirán volver a la web.

Árbol de superficies

```text
Next.js
  / → public/index.html
    header y navegación original
    main con seis vistas hash originales
      inicio con una entrada a /experiencia
    footer y diálogos originales
  /experiencia → aviso de etapa 2, enlace a /kiosco y retorno
  /kiosco → aviso de etapa 2, enlace a /experiencia y retorno
  /api/health → estado de configuración del servidor
```

Se usa CSS original para la landing y CSS local mínimo para los avisos. Sin Tailwind ni librerías UI. La estructura de los avisos incluye título, disponibilidad y navegación. Sus enlaces tienen hover y foco visibles. Son superficies informativas sin operaciones asíncronas. El texto envuelve y los controles se apilan cuando falta espacio. La landing conserva sus breakpoints y estados originales.

| Riesgo | Medida |
| --- | --- |
| Rediseñar accidentalmente la portada | Extraer CSS y JS literalmente y comparar contra legacy |
| Nueva entrada demasiado prominente | Enlace secundario con estilo existente |
| Simular un producto completo | Avisos explícitos de etapa 2, sin sesión ni QR ficticios |
| Cambiar geometría móvil | Comparación de las seis vistas a cuatro anchos |
| Confundir configuración y conexión real | Health con estados `configured_unverified`, demo, dry-run y simulador |

## Etapas

### 1 · Estructura y conservación

- [x] Auditar los cinco archivos y verificar el manifiesto.
- [x] Instalar Next.js estable, React, TypeScript strict y herramientas npm.
- [x] Extraer landing sin cambios de lógica, copiar PNG y brochure literalmente.
- [x] Incorporar rewrite, entrada secundaria, avisos y health con cabeceras.
- [x] Añadir pruebas unitarias y regresión Chromium contra ambos servidores.
- [x] Revisar visualmente escritorio y móvil: comparación automática legacy vs app con 0 píxeles distintos (revisor).
- [x] Ejecutar lint, typecheck, 16 unitarias y build con resultado satisfactorio.
- [x] Comprobar por HTTP la app de producción, los recursos y los hashes binarios.
- [x] Completar E2E y capturas: 65 passed, 1 skipped (ejecutado por el revisor fuera del sandbox).
- [x] Cerrar los cuatro documentos y registrar resultados y bloqueos.

### 2 · BD y continuidad (implementación local)

- [x] Esquema completo de 23 tablas y migración SQL, PGlite y driver Neon Pool transaccional.
- [x] Sesión anónima, preferencias y contenido de demostración con fuentes comprobadas.
- [x] APIs de kiosco autorizado y QR efímero con canje único, carrera y rollback probados.
- [x] Código de kiosco/móvil/Mi viaje, favoritos y limpieza transaccional.
- [ ] Validación remota de Neon (sin instancia configurada).
- [ ] Build completo, E2E y dos pasadas visuales reales (bloqueados por entorno).

### 3 · Correo y B2B

- [x] Adaptadores Resend HTTP/dry-run, outbox cifrada e idempotente y recuperación verificada (PGlite).
- [x] Consentimientos granulares, double opt-in, preferencias, baja, Svix y supresiones.
- [x] Exportación/borrado autenticados y retención local propuesta.
- [x] Solicitud comercial persistida aparte, auditada, validada y TXT conservado en código.
- [x] Migración nueva, unitarias, E2E escritos y documentación de operación/privacidad.
- [ ] Build completo y ejecución de E2E de etapa 3 fuera del bloqueo del entorno.
- [ ] Dos pasadas visuales reales de etapa 3 y regresión actual de 0 píxeles.
- [ ] Operación real de correo/Neon/DNS/cron, solo tras configuración y revisión autorizadas.

Estado de etapa 3 y límites: [ARY_STAGE3_REPORT](ARY_STAGE3_REPORT.md). No se enviaron correos reales y no se hizo commit/push. La ejecución autónoma dejó implementado el alcance y documentó los bloqueos exactos; no certifica verificación visual o producción.

### 4 · Operación

- [ ] Admin, CMS, tenants y autorización.
- [ ] Partner y analítica agregada con aislamiento.
- [ ] Adaptador de robot y simulador identificado.
- [ ] Documentación operativa, privacidad y demo WRO.

La etapa 1 se limita a la orden de `docs/codex/STAGE1.md`. Gemini es el proveedor de IA elegido por el usuario (clave en `.env.local`, nunca en el repo); se integra en una etapa posterior con modo demo de respaldo.

## Estado de cierre de la etapa 1 (histórico)

| Elemento | Estado actual | Evidencia |
| --- | --- | --- |
| Base preservada y framework | EXISTS | Hashes, extracción literal, build y HTTP |
| Health y cabeceras | EXISTS | Unitarias y HTTP de producción local |
| Accesos a experiencia | PARTIAL | Avisos de etapa 2, interacción pendiente |
| Regresión de navegador | EXISTS | 65 passed, 1 skipped |
| Comparación visual con el original | EXISTS | 0 píxeles distintos, 6 vistas × 4 anchos |
| BD, sesión, QR y móvil funcional | MISSING | Etapa 2 |
| Correo, consentimiento y B2B persistido | MISSING | Etapa 3 |
| Operación y hardware real | MISSING | Etapa 4 |

Etapa 1 cerrada: los cinco comandos pasan. Los errores exactos, cambios y decisiones están en `LEGACY_REGRESSION.md` y `ARY_MIGRATION_DECISION.md`.

## Etapa 2 · ejecución y estado actual

Diseño previo en `STAGE2_DESIGN.md`: flujo sin cuenta, preferencias opcionales, recomendador por reglas, sesión móvil nueva y limpieza del kiosco. CSS propio con paleta original, diccionarios centrales, targets ≥48 px, noindex, reduced-motion y estados de carga/error/offline. No se añadieron Tailwind ni librerías de cliente pesadas.

Implementadas las APIs especificadas y activación de dispositivo, cierre de sesión, fichas públicas y QR público. Sesiones/códigos/credenciales se guardan como hash. CSRF, rate limits persistentes, metadatos sin PII y aislamiento servidor. La misma migración funciona en PGlite y se proporciona el driver Neon de transacciones interactivas. En producción sin BD se devuelve 503; no hay persistencia local de respaldo.

Seed: 12 temas en dos idiomas; diez fuentes HTTP 200 publicadas y dos no publicadas (`needs_source`). Pruebas: 36 de dominio/API pasan, incluidas dos redenciones concurrentes con un ganador, rollback, copias, IDOR, expiración, límites, rotación y producción sin BD. El CLI migrate/seed/enroll/cleanup se ejecutó en local. Lint y typecheck pasan. Los chunks de entrada del kiosco compilados suman 17 317 bytes gzip; no es una medición de navegador.

Build: compila el código, luego `Running TypeScript ... spawn EPERM`. Dev y runner E2E: `spawn EPERM`. Playwright descubre 74 casos. Se mantuvieron regresiones originales; solo se adaptó el contrato que antes mostraba avisos de etapa 2 y health 200 sin BD. No se ejecutaron las dos pasadas visuales ni se midió CPU 4×. No se añadieron opciones experimentales para eludir el bloqueo.

Fuentes, archivos, comandos y límites: `FEATURE_MATRIX.md`. Seguridad: `ARY_QR_HANDOFF.md`. Revisión pendiente: `VISUAL_REVIEW.md`. La etapa está implementada localmente con aceptación bloqueada; no se presenta como verificada en navegador, Neon, Vercel o Raspberry Pi.

## Etapa 4A · cierre local

- [x] Despachar recovery/B2B/double opt-in por IDs después de commit, con bloqueo/idempotencia y timeout HTTP.
- [x] Sustituir window.confirm por consentimiento integrado y requerido en API, con TXT disponible.
- [x] Comprobación inicial honesta del kiosco y backoff offline de hasta 15 s.
- [x] AiProvider/Gemini/Demo, contexto delimitado, JSON/Zod, fuentes y guardrails.
- [x] Límites persistentes por sesión/global, ai_usage y migración 0002.
- [x] Chat temporal cifrado, restauración en sesión móvil, borrado al cerrar/transferir/recuperar y cleanup.
- [x] UI de chat con sugerencias, texto, carga/error/límite y modo efectivo.
- [x] RobotAdapter/Mock/Hardware, HMAC, nonce, deduplicación y mantenimiento allowlist.
- [x] Puente loopback SSE + POST con Origin/token y comandos nombrados.
- [x] Servicio Python, cola offline, simulador, serie/ACK, firmware de referencia y systemd.
- [x] Pruebas unitarias, Python y E2E escritos, documentación y placeholders.
- [x] Comandos de aceptación ejecutados o error exacto de sandbox registrado.
- [ ] Ejecución real de E2E y build completo fuera del bloqueo spawn EPERM.
- [ ] Dos pasadas visuales reales y regresión 0 píxeles de la versión final.
- [ ] Generación Gemini real validada, incluido el modelo final gemini-3.8-flash.
- [ ] Validación en Pi/servos/sensor reales, Chromium y políticas de red local.
- [ ] Conservación/transferencia de chat entre sesiones con autorización específica, voz y micrófono.

Los puntos pendientes son límites de verificación o trabajo posterior. Admin/CMS/partner continúan en etapa 4B. [Evidencia y archivos](ARY_STAGE4A_REPORT.md).
