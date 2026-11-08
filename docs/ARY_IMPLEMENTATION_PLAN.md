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

- [ ] Adaptador Resend dry-run y recuperación verificada.
- [ ] Consentimientos granulares, outbox, baja y supresiones.
- [ ] Solicitud comercial persistida y TXT conservado.

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
