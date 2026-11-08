# Operador y proveedor

## Entrar y preparar personal

```powershell
npm run db:migrate
npm run admin:create -- --email staff@example.invalid --org "Ary Admin" --role superadmin
npm run dev
```

No hay credenciales predeterminadas. El comando crea organización/membresía y fuerza correo dry-run. En desarrollo consultar `/dev/outbox`, abrir el enlace y confirmar. Después se puede solicitar otro enlace desde `/admin/entrar`. Solo se emite para una membresía activa en organización activa; la respuesta pública es idéntica si no existe. En producción el acceso solicitado usa el adaptador configurado; este trabajo no envió correo real.

Los enlaces caducan en quince minutos. Cookie propia `ary_staff`, ocho horas, HttpOnly/Strict y Secure en producción. Cada canje rota la sesión anterior del navegador; cerrar sesión elimina la sesión actual. Suspender una membresía u organización bloquea la siguiente operación, incluso con cookie vigente. No hay MFA nativo: proteger el buzón y planificar TOTP o IdP con MFA antes de un despliegue que lo requiera.

## Permisos efectivos

| Rol | Permisos |
| --- | --- |
| superadmin | Todas las tareas de operador, organizaciones, invitaciones, roles y estados |
| operator | Analítica global/CSV, dispositivos, CMS/puentes, aprobar/rechazar ofertas, campañas, solicitudes B2B y seguimiento de borrado |
| analyst | Analítica global/CSV y lectura de dispositivos; sin mutaciones ni bandejas individuales |
| provider_admin | Métricas, proveedores, leads y CRUD de ofertas de su organización, incluido borrado |
| provider_editor | Métricas, proveedores y leads propios, crear/editar ofertas; sin borrado ni administración global |

Una persona con varias membresías debe elegir organización en `/partner`. El parámetro no concede acceso: se comprueba contra la membresía y se incorpora al SQL. Superadmin no obtiene acceso a la bandeja de leads de un proveedor sin una membresía específica de proveedor. Las denegaciones de API son 401/403 o 404 para recursos ajenos; las páginas muestran acceso restringido.

## Tareas de operador

- `/admin`: sesiones, QR emitidos/canjeados y ratio, fichas vistas/guardadas, preguntas sin texto, correos verificados, ofertas, solicitudes, idiomas, intereses y temas. Periodos de 7/30/90 días y kiosco; la API admite un periodo de hasta 366 días. CSV exporta exactamente la consulta aplicada. Muestra de sesiones iniciadas, no personas únicas. Los datos DEMO son sintéticos.
- `/admin/dispositivos`: estado, última conexión, versión y último evento de robot. Crear enlace, rotar o revocar. El nuevo enlace se muestra una vez en la respuesta y el estado de esa pantalla; no se puede recuperar desde el listado. Rotación revoca inmediatamente la credencial antigua; requiere reactivar.
- `/admin/contenidos`: borrador, revisión y publicación. Cada edición vuelve a borrador y anula verificación. Fuente HTTPS pública y comprobada obligatoria para publicar. El checker resuelve DNS, rechaza IP privada/local/reservada, fija la conexión al resultado comprobado, impone timeout y rechaza redirecciones. Una respuesta HTTP válida acredita disponibilidad, no exactitud factual ni derechos de uso. Revisar fuente, licencia, editor, fecha y traducción; conservar la misma clave para es/en. Vista previa textual y QR público solo tras publicar. Los puentes también verifican su fuente. Moderación de ofertas en esta misma página.
- `/admin/organizaciones`: solo superadmin; crear tenant (si es proveedor crea su entidad de proveedor), invitar por enlace, cambiar rol/estado, suspender organización. Las invitaciones duran quince minutos; cambiar una membresía invalida sus invitaciones anteriores.
- `/admin/campanas`: con flag apagado explica su estado. Encendida: vista previa, recuento sin lista de correos y confirmación para poner en cola. Requiere consentimiento, double opt-in, suscripción activa, correo verificado, frecuencia permitida y ausencia de supresión. Se revalida al despachar. Crear campaña no envía, incluso en dry-run; el dispatcher consume la cola. El mismo ID evita duplicados.
- `/admin/solicitudes`: datos B2B separados de visitantes; solo operador/superadmin. Estado nuevo/en curso/cerrado; filas históricas `received` se presentan como nuevo. No se añaden a marketing.
- `/admin/privacidad`: referencias y estados de `deletion_jobs`, sin correos ni chats.

Accesos y mutaciones quedan en `audit_logs`; no se registra el texto privado en auditoría. Las bandejas de B2B y leads contienen solo los datos necesarios para su propósito y tienen permisos distintos de analítica.

## Consentimiento de leads

`FEATURE_ENABLE_PARTNER_SHARING=false` por defecto. Activarlo permite mostrar ofertas aprobadas de proveedores/organizaciones activos en `/experiencia` y `/mi-viaje`. La etiqueta «Patrocinado» no altera ranking ni fichas culturales.

La confirmación enumera proveedor, finalidad, contacto por correo verificado y campos elegidos entre nombre, correo, mensaje, fecha aproximada y número de personas. Todos empiezan desmarcados; el correo debe elegirse como método de contacto. Solo se acepta en un dispositivo personal con cuenta verificada. No se comparte chat, país/intereses, sesión ni perfil completo; nunca se distribuye a todos los proveedores.

El servidor crea consentimiento versionado con prueba de proveedor/oferta/campos y lead con TTL. Envía el recibo transaccional tras commit por la outbox; dry-run significa que no salió correo. El proveedor recibe acceso en su bandeja, sin correo automático ni exportación de leads. Puede cambiar estado nuevo/contactado/cerrado. La revocación específica en `/cuenta/privacidad` o la revocación global de provider_share oculta el lead y elimina el payload. Cambiar el flag no impide revocar una solicitud anterior.

Plazo propuesto: `PROVIDER_LEAD_RETENTION_DAYS=30`, máximo 90. Debe revisarlo el responsable. Lo ya visto/exportado no se puede recuperar desde Ary; el responsable debe tramitar esa parte. Una solicitud no activa marketing.

## Cron y operación

`/api/internal/email-dispatch` diario a las 13 UTC; `/api/internal/cleanup` diario a las 14 UTC. Ambos exigen `CRON_SECRET`. La [documentación oficial de Vercel](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing) consultada el 8 de noviembre de 2026 admite 100 cron por proyecto y frecuencia mínima diaria en Hobby, con precisión horaria. Esta configuración usa dos diarios. Confirmar plan/uso antes de desplegar; aquí no se desplegó. La cola procesa diez filas por invocación, por lo que campañas mayores necesitan invocaciones autorizadas adicionales o un diseño de lotes posterior; no se promete entrega inmediata de campañas.

Comandos manuales: `npm run db:cleanup`, `npm run demo:seed`, `npm run demo:reset`. Para PGlite detener el servidor antes de ejecutar CLI. [Pruebas y límites](ARY_STAGE4B_REPORT.md).
