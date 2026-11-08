# Privacidad · revisión pendiente

Etapa 2 implementa minimización técnica, sesión anónima temporal, tokens hash, separación kiosco/móvil, ausencia de correo/marketing, guardados por propietario, país voluntario y analytics con lista blanca. No hay audio, geolocalización, reconocimiento facial ni inferencias de gustos por nacionalidad.

La interfaz explica el acceso temporal (24 h por defecto, configurable), QR de 120 s y diferencia entre caducidad y borrado físico. Los eventos tienen retención de 90 días por defecto, pendiente de decisión; el operador debe ejecutar `db:cleanup`. No hay cron desplegado ni borrado certificado de backups.

Antes de producción, revisión jurídica/operativa pendiente: identificar responsable y contacto; determinar normas aplicables a República Dominicana y visitantes internacionales; fijar plazos y finalidades; revisar menores y transferencias internacionales; contratos de alojamiento/base de datos; acceso/exportación/supresión; logs y backups. Las tablas de consentimiento no implican que exista una interfaz de consentimiento o que se haya otorgado alguno.

No se certifica cumplimiento de una ley concreta. Correo verificado, consentimientos granulares, panel de privacidad y proveedores quedan para las etapas 3/4. Ningún usuario de prueba ni dirección real recibió mensajes.
