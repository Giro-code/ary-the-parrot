# Plan de implementación de Ary

Etapa solicitada 1. Fecha de trabajo 7 de noviembre de 2026. Base `b04db41`, rama `main`, tag `baseline-static-ary`. Los documentos del usuario ya estaban sin seguimiento en Git. Se conserva ese estado.

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

### 2 · BD y continuidad

- [ ] Neon Postgres y migraciones transaccionales.
- [ ] Sesión anónima, preferencias y contenido cultural curado.
- [ ] Kiosco funcional y QR efímero con canje único.
- [ ] Continuidad móvil, favoritos y limpieza del kiosco.

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

## Estado de cierre

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
