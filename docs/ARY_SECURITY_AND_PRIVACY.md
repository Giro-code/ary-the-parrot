# Seguridad y privacidad · etapa 3

## Adición vigente · etapa 6: voz opcional

La voz se usa únicamente para transcribir la pregunta y responderla, y para sintetizar la respuesta validada de Ary. La base propuesta es una elección previa, voluntaria e informada para esta finalidad opcional, más el permiso técnico del navegador; el responsable debe confirmar la base jurídica aplicable. Un permiso del navegador por sí solo no certifica consentimiento jurídico.

Antes de solicitar micrófono hay explicación, enlace a Privacidad y opciones «Acepto · Grabar» / «Usar teclado». Se informa del envío a **Google Gemini**, del máximo 15 s y de no incluir datos personales. Presencia, carga y restauración de sesión no abren el micrófono. En el kiosco se muestra «Micrófono activo», tiempo y botón Parar. Teclado/cierre/offline detienen las pistas y descartan grabaciones canceladas. Silenciar solo afecta la salida de Ary.

Grabaciones: buffers en memoria, máximo 1 MiB por solicitud; no BD, Blob, logs ni archivos. Google recibe audio, contexto publicado e historial cultural acotado; los temas sensibles hablados se reconocen después del envío. La transcripción y respuesta se cifran en el chat temporal hasta el TTL de sesión; cierre/canje/recuperación borran el chat y cleanup purga caducados. `ai_usage` solo guarda modelo, tokens, latencia, modo y código saneado, sin contenido/identidad. Caché de salida sintetizada: memoria, cinco minutos, máximo 12 MiB. No se promete retención cero ni borrado en Google.

Ambas rutas exigen sesión y CSRF. Ask comparte límites/pipeline de chat y valida el cuerpo mientras lo lee, MIME y contenedor. La duración de cabecera es declarada por el cliente; el corte real de 15 s se impone en el grabador y no equivale a validación del tiempo del contenedor en servidor. Speak acepta solo UUID de mensaje assistant propio vigente y validado, nunca texto del cliente; límites propios por sesión/global, incluidos hits de caché. Sesiones cerradas rechazan respuestas tardías. Timeouts acotan proveedor/cliente; errores se muestran sin filtrar respuestas privadas del proveedor.

`Permissions-Policy` permite micrófono exclusivamente en `/kiosco` y `/experiencia`; cámara/geolocalización permanecen bloqueadas. CSP permite salida local/blob y mantiene loopback del puente solo en kiosco. No se envían secretos al cliente. El robot y las ilustraciones usan el mismo `RobotState`; `speaking` depende del audio real.

Menores en kiosco público: se pide usar teclado o ayuda de acompañante adulto; no se infieren edad, identidad vocal o biometría. El responsable debe definir edades, proceso de acompañamiento, base jurídica, contrato con Google, retención externa y transferencias antes de uso público. No hay verificación automática de edad ni se afirma cumplimiento legal. Las evidencias WAV de desarrollo son sintéticas y previas; no son grabaciones de visitantes. [Pipeline y límites](ARY_AI.md), [revisión pendiente](PRIVACY_COMPLIANCE_REVIEW.md).

Modelo técnico implementado y probado con PostgreSQL PGlite. No equivale a aprobación jurídica ni a validación de Neon/Resend/Vercel reales. No se enviaron correos, no se hizo commit/push ni despliegue.

## Datos y propietarios

| Datos | Ubicación y acceso |
| --- | --- |
| Cuenta verificada | `visitor_accounts`: email AES-256-GCM, HMAC para búsqueda y fechas. Solo se crea al consumir enlace |
| Solicitud de acceso pendiente | `auth_magic_links`: token SHA-256, email cifrado/HMAC, finalidad, origen de sesión y TTL. Conocer el correo no vincula una cuenta |
| Sesiones | `visitor_sessions`: hash de credencial, preferencias operativas, propietario después de verificar. Cookie HttpOnly, SameSite=Lax, Secure en producción |
| Guardados | `saved_experiences`: anónimos por sesión, verificados canónicos por `visitorId`; unique por propietario/ficha |
| Consentimientos | `consent_records`: propósito, granted, noticeVersion, locale, source, proof y revocación; historial conservado |
| Suscripción | `email_subscriptions`: pending/active/paused/unsubscribed/suppressed, double opt-in, frecuencia, baja hasheada; token de baja cifrado en `addressRef` |
| Correo | `email_outbox`: referencia visitante o comercial, destinatario/mensaje cifrados, estado, clave idempotente y error saneado |
| Supresión y replay | `email_suppressions`: HMAC sin email; `email_webhook_events`: ID del evento firmado |
| Solicitudes B2B | **Tabla separada** `commercial_inquiries`: payload de cinco campos cifrado, referencia legible, source, status, leadType, locale, consentVersion, idempotencia y auditoría. No crea turistas ni campañas |

HMAC-SHA256 usa `AUTH_SECRET`; AES-256-GCM deriva su clave de `SESSION_ENCRYPTION_KEY`, IV aleatorio de 96 bits y AAD versionada. Producción exige ambas claves de mínimo 32 caracteres, sin fallback; desarrollo/tests usan claves derivadas explícitamente rotuladas. Es una capa de protección en reposo, no sustituye permisos de BD, backups cifrados ni gestión/rotación de claves. No hay secretos en variables públicas.

## Recuperación

Email: trim y dominio en minúsculas; se conserva el local-part, puntos y `+`. Rate limits persistentes por HMAC de cliente y email: 10 por cliente/15 min, 3 por email/15 min; verificación 20 por cliente/15 min, además del límite general de mutaciones. Es un límite de solicitudes, no una prueba de identidad.

Token: 256 bits CSPRNG, solo SHA-256 guardado, caducidad 15 min. GET nunca consume. POST condicional dentro de transacción (`used_at IS NULL`, caducidad del servidor); dos consumidores simultáneos no pueden ganar. Un fallo posterior revierte el consumo. Se serializa la cuenta durante la fusión, se fusionan guardados sin duplicados, se preservan visitas/favoritos y se recuperan preferencias. Se vinculan la sesión origen y la sesión anónima actual solo si son compatibles con el titular. Sus credenciales anteriores se invalidan; la respuesta establece una cookie nueva y el cliente reemplaza la URL por `/mi-viaje`.

La invalidación de los tokens anónimos fusionados impide que alguien que inició una solicitud con el correo ajeno gane acceso cuando el verdadero titular confirma. Nunca se fusionan los datos de una cuenta ya autenticada diferente. El token da control al primer POST válido; quien controla el buzón o roba un enlace puede autenticarse. No hay segundo factor. El correo no contiene datos de viaje ni perfil.

## Consentimiento y derechos

Propósitos: `service_storage`, `transactional_recovery`, `marketing_email`, `provider_share`, `analytics_optional`. Recuperación explícita incluye aviso de conservación; marketing es una casilla diferente sin preselección y exige double opt-in. Revocar no borra la historia. La revocación de recuperación invalida enlaces pendientes; revocar conservación detiene guardados canónicos futuros. El borrado elimina los existentes. Autorizar una categoría de cesión no comparte nada: una integración futura deberá pedir receptor y campos específicos. No existe cesión de perfiles/chats implementada en esta etapa.

Exportación y borrado derivan el titular de la cookie verificada; no aceptan IDs/email del cliente. Exportación JSON descargable incluye datos de cuenta, sesiones, selecciones, guardados, consentimientos, suscripciones, metadatos de correos y, si existen, chats, recomendaciones y leads propios. Excluye credenciales, hashes de sesión y tokens.

Borrado transaccional: `deletion_jobs` registra procesamiento/completado; elimina cuenta, sesiones, guardados, preferencias, enlaces, suscripciones y datos dependientes; anula pendientes y elimina destinatarios/mensajes cifrados del outbox. Conserva historia de consentimiento anonimizada, auditoría sin actor y supresiones por hash para no volver a enviar a direcciones rebotadas/quejosas. Un job completado describe la BD operativa, **no los backups ni sistemas externos**. Los datos ya transmitidos requieren gestión del responsable; no se simula un aviso a encargados. La solicitud B2B tiene una finalidad/retención separadas y no se elimina al borrar la cuenta visitante.

## Retención propuesta y limpieza

`npm run db:cleanup` aplica: sesiones según TTL configurado, enlaces al caducar, outbox/eventos de webhook tras 30 días, solicitudes comerciales tras 180 días, cuentas tras 365 días de inactividad (`lastActiveAt` actualizado por acceso autenticado) y analytics según configuración. Las cuentas se purgan mediante el mismo servicio de borrado. Evidencia anónima de consentimiento/auditoría y hashes de supresión no tienen purga automática: plazo definitivo requiere revisión jurídica. La ejecución de cleanup sigue siendo responsabilidad del operador; **no hay cron de limpieza desplegado**. Si la tarea no se programa, caducar el acceso no implica borrado físico puntual. Los plazos son propuestas revisables, no una política legal aprobada.

## Amenazas y límites

| Amenaza | Control / pendiente |
| --- | --- |
| Enumeración | Misma respuesta exista/no exista cuenta; no se busca/crea cuenta al pedir enlace |
| CSRF / payload | Origin/Host + header, JSON estricto con Zod, 8 KiB; webhook/baja usan firma/capability en vez de cookie |
| IDOR | Titular de cookie; todas las consultas de guardados/privacidad se filtran por propietario |
| Replay | Enlace con UPDATE atómico; outbox idempotente; eventos Svix deduplicados |
| Robo de enlaces | TTL, no-referrer/no-store/noindex, URL limpia tras verificar; revisar logs/CDN/trazas de infraestructura antes de producción |
| Envío repetido | Bloqueo de fila y clave Resend reusada; horizonte de reintentos inferior a su ventana de idempotencia |
| Marketing no consentido | Bandera, consentimiento, double opt-in, estado/frecuencia y supresión en enqueue y dispatch |
| Webhook falso | Svix en cuerpo crudo, tolerancia de reloj y comparación constante; sin secreto 503 |
| Bots B2B | Honeypot, 5 solicitudes/h por cliente, idempotencia con detección de payload distinto, validación y auditoría |
| Dev outbox público | 404 en producción; fuera de producción es exclusivamente un demo local con datos sintéticos |
| Denegación de servicio | Límites de aplicación persistentes; proxy de confianza, protección volumétrica y normalización de IP requieren operación |
| Borrado durante entrega | Solo se cancelan pendientes; el correo ya transmitido y backups no se recuperan con esta API |

Pendiente antes de producción: responsable/contacto, normas aplicables, menores, transferencias internacionales, contratos con encargados, DNS real, claves, plan cron, inspección de logs, backups/restauración y pruebas de operación real. Ver [revisión de cumplimiento](PRIVACY_COMPLIANCE_REVIEW.md) y [configuración de correo](ARY_EMAIL_SETUP.md).

## Adiciones de etapa 4A

El chat usa la sesión y CSRF existentes. Clasifica temas sensibles antes del modelo, filtra instrucciones en fichas e historial, delimita entradas y valida JSON/citas. Renderiza texto plano con URLs del catálogo publicado. El patrón de clasificación y la validación de citas reducen riesgos y requieren evaluación semántica antes de operar con visitantes reales.

Historial AES-GCM hasta la expiración de la sesión, borrado al cierre/canje/recuperación y purga con db:cleanup. La retención técnica de ai_usage y robot_events es 30 días, sin texto de conversación ni identidad de visitante. La UI/privacidad informan del procesamiento con Google. Retención externa, menores y transferencias quedan sujetos a revisión. Conservar chat entre sesiones requiere un permiso específico futuro.

Robot cloud requiere HMAC-SHA256 sobre método/ruta/dispositivo/timestamp/nonce/hash de bytes exactos. Timestamp ±60 s, nonce de un uso guardado 180 s y eventId único. El dispositivo debe estar activado y vigente. La web pública carece de una API de comandos de motor. El polling secundario solo obtiene mantenimiento rest/stop de filas insertadas por un operador con acceso autorizado a BD.

Puente exclusivo de loopback, Host fijo, Origin restringido y bearer HMAC de 120 s emitido a una cookie de kiosco autorizada. Verifica audiencia, origen, dispositivo, caducidad y firma. Límites de comandos y campos estrictos bloquean ángulos. Las políticas de Chromium se acotan al origen y la CSP de loopback a /kiosco. Una credencial local es temporal y permanece en memoria/cabeceras. El firmware impone límites mecánicos, suavizado, ACK y watchdog. La configuración física continúa pendiente.

La petición de recuperación conserva su respuesta uniforme, incluso si el proveedor falla. Las filas inmediatas se despachan tras commit por sus IDs y comparten bloqueo/idempotencia con el cron. B2B ahora exige treatmentConsent=true y el aviso vigente, además de su canal cifrado y separado.

## Controles a?adidos en 4B

Personal usa cookie ary_staff separada, HttpOnly/Strict, Secure en producci?n y TTL de ocho horas, con rotaci?n al canjear un enlace propio de quince minutos. Cada API/p?gina vuelve a validar roles/membres?a/organizaci?n activa. Partner filtra organizaci?n en SQL para lecturas, altas, cambios y bajas. No existe MFA nativo; TOTP/IdP requiere integraci?n futura.

Leads: destinatario ?nico, correo verificado elegido expl?citamente, campos limitados, prueba versionada, payload cifrado, idempotencia y caducidad propuesta de treinta d?as. Revocaci?n espec?fica o global elimina el payload y bloquea nuevas lecturas por el join con consent_records. No se puede recuperar lo que un tercero ya haya visto. Nunca se comparte chat/perfil. El flag por defecto es false y no impide revocar datos previos.

Fuente CMS: solo HTTPS sin credenciales ni puerto arbitrario, resoluci?n DNS p?blica completa, conexi?n fijada a direcci?n validada, timeout y sin redirecciones. Una URL disponible no valida contenido, licencia ni consejo factual. Anal?tica: sin texto/correo/perfil, supresi?n <10 y ratios protegidos; periodos solapados a?n permiten inferencias. Cron requiere CRON_SECRET. Revisar jur?dicamente retenci?n, finalidad/responsables, menores y transferencias antes de operar; no se afirma cumplimiento por un checkbox.

Detalles, permisos y l?mites: [operador/proveedor](ARY_OPERATOR_AND_PARTNER.md) y [evidencia 4B](ARY_STAGE4B_REPORT.md).
