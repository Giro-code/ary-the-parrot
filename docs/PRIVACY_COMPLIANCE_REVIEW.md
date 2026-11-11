# Revisión vigente · etapa 8

La web ahora solicita correo, aceptación explícita de términos/privacidad e informa del historial; el dispositivo público conserva QR. Se almacenan conversaciones de cuentas verificadas con consentimiento `conversation_history`, cifradas, por 90 días por defecto configurables. Finalidad: dar seguimiento y continuar conversaciones y descubrimientos culturales. Se permiten apertura/continuación, exportación, borrado individual, retirada y borrado de cuenta. El cron existente purga caducadas. El audio no se guarda. Ver [contrato técnico actualizado](ARY_SECURITY_AND_PRIVACY.md).

`terms`, `conversation_history` y `marketing` son pruebas técnicas versionadas; no constituyen por sí mismas una conclusión de validez jurídica. Marketing no está premarcado y requiere DOI distinto de verificación de acceso. El correo provisional tiene cinco preguntas por HMAC durante 24 h y límites por IP; no se crea cuenta por conocer una dirección.

Pendientes del responsable: identidad/contacto y ley aplicable; revisión de la aceptación agrupada de términos/historial y bases jurídicas; retención de conversaciones, sesiones, guardados y backups; menores/supervisión; contratos con Google, Resend, Vercel y BD; transferencias internacionales; ejercicio de derechos e incidentes. Los términos muestran «Borrador pendiente de revisión legal» con marcadores claros. No se certifica cumplimiento de ninguna ley.

Comprobación pública de correo el 2026-11-10: health devuelve `configured_unverified`, no `dry_run`. No prueba entrega, DNS ni webhooks. El proyecto no está accesible mediante el conector Vercel de esta sesión; no se leyeron valores privados ni se enviaron correos. La ejecución local mantiene dry-run. [Evidencia](evidence/stage8/production-email-status.json).

Pruebas locales de cifrado/retención/propiedad/retirada no equivalen a aprobación jurídica, despliegue ni validación de producción. Las dos pasadas visuales y Safari/Chrome físico siguen bloqueadas, según [evidencia](evidence/stage8/visual-review.md).

---

# Privacidad · revisión pendiente

## Estado vigente · etapa 6: audio opcional

Aviso ES/EN en `/privacidad` y explicación previa en el chat: finalidad de transcripción/respuesta y síntesis de la voz de Ary, proveedor Google Gemini, decisión voluntaria antes del permiso técnico, teclado como alternativa y control de grabación visible. Cada grabación empieza por acción explícita, dura como máximo 15 s en el cliente y se cancela al cambiar a teclado, salir u offline. Presencia no activa micrófono. Se desaconsejan nombres y datos personales.

La aplicación no almacena audio de visitante en BD, logs, Blob o archivos: buffers en memoria de hasta 1 MiB y envío inline al proveedor. La transcripción y la respuesta sí forman parte del historial cifrado y temporal de la sesión; `ai_usage` no tiene texto/audio/identidad. La caché de hasta cinco minutos es solo de voz sintetizada de Ary. Los WAV de evidencia son ejemplos sintéticos de desarrollo, sin visitantes. No se promete retención cero en Google. Los temas sensibles hablados se derivan después de transcribir, por lo que el proveedor ya habrá procesado ese audio.

**Base propuesta para revisión:** elección informada y voluntaria de una finalidad opcional; el responsable debe confirmar su encaje jurídico, retirada y prueba adecuada. La aceptación de la pantalla y el permiso del navegador no certifican por sí solos la validez del consentimiento. El teclado debe continuar disponible sin conceder voz.

**Pendiente específico antes de operación pública:** identidad/contacto del responsable; contrato/condiciones y modalidad de cuenta Google; tratamiento/retención del proveedor y transferencias internacionales; edades y procedimiento de acompañante/representante en kiosco público; texto y accesibilidad del aviso; plazos, borrado y derechos sobre transcripciones; política de logs del alojamiento. No se infieren identidad vocal, edad ni perfiles biométricos. No hay mecanismo de verificación de edad implementado. Debe validarse el flujo real en dispositivo y completar las dos pasadas visuales, actualmente bloqueadas por `spawn EPERM`. [Informe y evidencia](ARY_STAGE6_REPORT.md).

## Estado actual · etapa 3

Se implementaron cuenta opcional solo tras verificar correo, cifrado AES-GCM/HMAC, enlaces de 15 minutos, cinco finalidades versionadas, recuperación explícita, marketing separado con double opt-in y sin preselección, preferencias/pausa/baja, supresiones, JSON propio y borrado transaccional. Solicitudes B2B en tabla separada y nunca inscritas en campañas. Modo prueba por defecto; no se enviaron correos reales. Evidencia de dominio/API con PGlite y fetch simulado; UI/E2E reales pendientes según [informe](ARY_STAGE3_REPORT.md).

La política técnica propuesta conserva cuentas 365 días de inactividad, correo/eventos de webhook 30 días y B2B 180 días; cleanup requiere operación programada. Se conserva evidencia anónima de consentimiento/auditoría y hashes de supresión sin plazo automático aprobado. Borrar la cuenta no certifica borrado de backups o datos transmitidos. No existe integración de cesión a proveedores ni campañas recurrentes en esta etapa.

**Revisión jurídica antes de producción:** identificar responsable y contacto; confirmar base jurídica de cada finalidad y tratamiento B2B; validar retención, supresión, backups, contratos con Resend/BD/alojamiento, transferencias internacionales, menores, reglas de marketing/frecuencia/baja y ejercicio de derechos de solicitantes B2B. La confirmación nativa del formulario informa finalidad/versionado y permite cancelar para descargar solo TXT; revisar su texto final y accesibilidad en navegador. SPF/DKIM/DMARC y plan cron no están verificados. No se declara cumplimiento de una ley concreta.

Detalles de controles y amenazas: [ARY_SECURITY_AND_PRIVACY](ARY_SECURITY_AND_PRIVACY.md). Instrucciones de operación: [ARY_EMAIL_SETUP](ARY_EMAIL_SETUP.md).

## Historial · etapa 2

Etapa 2 implementa minimización técnica, sesión anónima temporal, tokens hash, separación kiosco/móvil, ausencia de correo/marketing, guardados por propietario, país voluntario y analytics con lista blanca. No hay audio, geolocalización, reconocimiento facial ni inferencias de gustos por nacionalidad.

La interfaz explica el acceso temporal (24 h por defecto, configurable), QR de 120 s y diferencia entre caducidad y borrado físico. Los eventos tienen retención de 90 días por defecto, pendiente de decisión; el operador debe ejecutar `db:cleanup`. No hay cron desplegado ni borrado certificado de backups.

Antes de producción, revisión jurídica/operativa pendiente: identificar responsable y contacto; determinar normas aplicables a República Dominicana y visitantes internacionales; fijar plazos y finalidades; revisar menores y transferencias internacionales; contratos de alojamiento/base de datos; acceso/exportación/supresión; logs y backups. Las tablas de consentimiento no implican que exista una interfaz de consentimiento o que se haya otorgado alguno.

No se certifica cumplimiento de una ley concreta. Correo verificado, consentimientos granulares, panel de privacidad y proveedores quedan para las etapas 3/4. Ningún usuario de prueba ni dirección real recibió mensajes.
