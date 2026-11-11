# Codex — Etapa 4B: administración, proveedores, analítica agregada, leads consentidos y documentación WRO

Sigues en `D:\Ary The Parrot`. Las etapas 1–4A están hechas, verificadas por el revisor y commiteadas. Lee primero `docs/FEATURE_MATRIX.md`, `README.md` y las notas del revisor en los informes. Documento rector: `docs/ARY_PROMPT_MAESTRO.md`. En esta etapa aplican sobre todo:

- 0C, criterio 4
- 2, Flujo D
- 3: `/admin*` y `/partner*`
- 5: analytics, partner y lead-request
- 9, 11, 12
- 13, puntos 7, 8 y 14
- 14, 17

## Restricciones

- No toques `legacy/`, `public/brochure.html`, `public/assets/` ni `public/index.html`. La landing debe seguir en 0 píxeles distintos.
- No hagas commits ni push. No envíes correos reales.
- No imprimas la clave de Gemini.
- Ignora memorias de otros proyectos.
- Tu sandbox no lanza Chromium ni `next dev`; el revisor ejecuta los E2E. Usa las lecciones ya documentadas en `STAGE4A.md`: `.filter` con alert, reloj antes de cargar, `toPass` para clics en frío.
- No metas rodeos de sandbox en la configuración.

## 1. Acceso administrativo y RBAC

- **Acceso del personal.** Enlace mágico propio, en `/admin/entrar`, separado de los visitantes:
  - Solo para correos con membresía activa.
  - Respuesta idéntica, exista o no la membresía.
  - Token de un solo uso con TTL de 15 min. Reutiliza la infraestructura de `auth_magic_links` con `purpose = "staff_login"`.
  - Sesión de staff en una cookie distinta, `ary_staff`: HttpOnly, SameSite=Strict y TTL corto (8 h).
  - La sesión se rota al entrar.
- **MFA.** Documenta que no hay MFA nativo y qué opción habría (por ejemplo TOTP). No lo finjas.
- **Bootstrap.** El script `npm run admin:create -- --email <correo> --org "Ary Admin" --role superadmin` crea una organización y una membresía. En dev, el enlace aparece en `/dev/outbox`. Nada de credenciales por defecto.
- **Roles** (de la sección 4): `superadmin`, `operator`, `provider_admin`, `provider_editor`, `analyst`.
- **Autorización en el servidor** con un helper `requireStaff({ roles, organizationId })` en cada endpoint y página. Todas las consultas de proveedor filtran por `organizationId` **en la consulta SQL**, no solo en la UI.
- **Prueba de aislamiento.** Proveedor A pidiendo datos de B → 403 o vacío. Prueba también la escalada vertical: un `provider_editor` intenta una acción de admin.
- **Auditoría.** `audit_logs` registra cada acción administrativa.

## 2. Panel de operador `/admin`

- **Métricas agregadas** desde `analytics_events`, filtrables por periodo y kiosco:
  - sesiones;
  - QR emitidos y canjeados, con ratio;
  - temas e intereses;
  - idiomas;
  - fichas vistas y guardadas;
  - conversiones voluntarias: correo verificado y solicitud a proveedor.
- **Supresión de grupos pequeños.** Celdas con menos de 10 muestran «<10», también en el CSV.
- **Muestra y privacidad.** Se muestra el tamaño de la muestra. Ningún dato individual, chat ni correo.
- **Gráficos.** Ligeros: SVG/CSS propio, sin librerías pesadas, accesibles y con tabla alternativa.
- **Exportación.** `GET /api/analytics/overview` (JSON) y su export CSV, solo agregados.
- **`/admin/dispositivos`.**
  - Kioscos con estado, `lastSeenAt`, versión y último evento de robot.
  - Botón «Generar enlace de activación», que muestra el enlace una sola vez.
  - Rotación y revocación.
- **`/admin/contenidos`** (CMS):
  - Flujo de fichas `draft → review → published`, con fuente, licencia, editor, `sourceCheckedAt` y `lastReviewedAt`.
  - No se publica sin fuente.
  - Botón «Verificar fuente», que hace una petición HTTP con allowlist de esquemas https y protección SSRF: sin IPs privadas ni localhost, con timeout.
  - Traducciones es/en y gestión de puentes culturales.
  - Vista previa y QR público de la ficha.
- **`/admin/organizaciones`.** Tenants, membresías, invitaciones por enlace mágico, roles y estado.
- **`/admin/campanas`.**
  - Solo si `FEATURE_ENABLE_MARKETING=true`. Si no, la página explica que está deshabilitado.
  - Vista previa, destinatarios = suscripciones activas con double opt-in y sin supresión. Muestra el recuento, nunca la lista de correos.
  - Envío solo a la cola y con confirmación. Auditoría.
- **Solicitudes B2B.** Bandeja de `commercial_inquiries` con cambio de estado (`nuevo`, `en curso`, `cerrado`). Acceso solo para `superadmin` y `operator`.
- **Privacidad.** Bandeja de `deletion_jobs` con su estado.

## 3. Panel de proveedor `/partner`

- **`/partner/ofertas`.**
  - CRUD de ofertas y experiencias propias, en el estado `pending_review`.
  - Un operador las aprueba o rechaza.
  - Cada oferta lleva una etiqueta **«Patrocinado»** visible cuando aplica.
  - El patrocinio no altera fichas ni rankings factuales.
- **Métricas propias.** Vistas, clics y solicitudes recibidas, en agregado y con umbral.
- **Bandeja de leads.** Solo los compartidos expresamente con ese proveedor y solo los campos autorizados.
  - Estados: nuevo, contactado, cerrado.
  - Sin acceso a sesiones, chats ni otros proveedores.

## 4. Leads consentidos del visitante (Flujo D, 4–6)

- **Dónde.** Con `FEATURE_ENABLE_PARTNER_SHARING=true`, una oferta aprobada en `/experiencia` o `/mi-cultura` muestra «Enviar mi solicitud a [Proveedor]». Con `false`, esa opción no aparece.
- **Pantalla de confirmación.** Muestra el nombre del proveedor, la finalidad, el método de contacto y los campos que se compartirán. Los campos son elegibles y se limitan a:
  - nombre;
  - correo verificado;
  - mensaje;
  - fecha aproximada;
  - número de personas.
- **Al confirmar:**
  - Se crea un `consent_records` con `purpose = "provider_share"`, versión y `proof`.
  - Se crea `provider_leads` con `userAuthorizedFields` y caducidad.
  - El visitante recibe el recibo «Solicitud enviada a un proveedor» (plantilla 6), con envío inmediato.
  - Se escribe en auditoría.
- **Revocación** desde `/cuenta/privacidad`.
  - Bloquea accesos futuros: el lead desaparece de la bandeja del proveedor.
  - Se explica el límite: lo ya visto o exportado no se puede recuperar.
- **Restricción absoluta.** Nunca se envía el chat ni el perfil completo. Nunca se envía a todos los proveedores.

## 5. Analítica y retención

- **Eventos.** Completa la instrumentación con lista blanca:
  - `chat_asked`, sin texto;
  - `offer_viewed`, `offer_clicked`;
  - `lead_shared`;
  - `account_verified`.
- **Limpieza.** Amplía `db:cleanup` para cubrir los eventos según `ANALYTICS_RETENTION_DAYS`.
- **Cron.** Endpoint protegido `/api/internal/cleanup`, con cron diario en `vercel.json`. Respeta el límite de cron de Vercel Hobby: diario, y como máximo los permitidos.

## 6. Datos demo y documentación final

- **Seed de demo.** `npm run demo:seed`, inequívocamente rotulado como demo y sin PII real:
  - organización aeropuerto `Demo Airport (ficticio)`;
  - dos proveedores ficticios;
  - ofertas de ejemplo rotuladas como demo;
  - eventos analíticos sintéticos suficientes para que las métricas pasen el umbral;
  - staff de demo con correos `@example.invalid`.

  Añade también `npm run demo:reset`.
- **Documentos:**
  - `docs/ARY_ARCHITECTURE.md`: diagrama Mermaid de Vercel ↔ móvil ↔ BD ↔ email ↔ Gemini ↔ Raspberry Pi.
  - `docs/ARY_OPERATOR_AND_PARTNER.md`: permisos, datos visibles, consentimiento de leads y analítica.
  - `docs/ARY_WRO_DEMO_SCRIPT.md`: recorrido reproducible de 5 minutos (sección 14), sin datos reales, con los comandos exactos.
  - `docs/WRO_TECH_DIAGRAM.md`.
  - `docs/ARY_B2B_BUSINESS_MODEL.md`: ingresos potenciales, costes y supuestos explícitos. Sin inventar contratos. Arajet solo como oportunidad.
- **Tabla final** en `docs/FEATURE_MATRIX.md`: **Función | Implementado | Probado | Requiere configuración | Evidencia**. Actualiza `ARY_IMPLEMENTATION_PLAN.md` con las casillas y el README.

## Tests

- **Vitest:**
  - RBAC: horizontal y vertical.
  - Aislamiento de tenant en cada endpoint de partner.
  - Umbral `<10` en analítica y CSV.
  - Lead: solo los campos autorizados; revocación → invisible para el proveedor; sin flag → 404.
  - Staff login: enumeración, un solo uso y caducidad.
  - CMS: no se publica sin fuente; SSRF bloqueado (localhost, 10.x, 169.254.x).
  - Campañas: con el flag en `false`, cero filas.
  - Cleanup.
- **Playwright:**
  - Staff entra por el outbox de dev y ve métricas agregadas con «<10».
  - Proveedor A no ve los datos de B.
  - El visitante comparte una solicitud con el proveedor P, P la ve con los campos elegidos, el visitante revoca y P deja de verla.
  - CMS: borrador → publicada.

## Criterio de terminado

- `lint`, `typecheck`, `test` y `build` pasan, o queda documentado el error exacto del sandbox.
- E2E escritos.
- Al terminar, imprime: archivos, migraciones, variables, comandos con su resultado y bloqueos.
