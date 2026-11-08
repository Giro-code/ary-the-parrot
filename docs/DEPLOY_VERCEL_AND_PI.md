# Operación prevista · Vercel y Raspberry Pi

No se desplegó ni configuró infraestructura durante la etapa 2.

Vercel aloja Next.js y las APIs. Configurar un origen HTTPS real en `APP_BASE_URL`, Neon en `DATABASE_URL`, un secreto estable `RATE_LIMIT_SALT` y los TTL. Aplicar migraciones con el CLI desde un entorno autorizado, revisar el seed y sus fuentes antes de usarlo en producción. Verificar health por HTTP: sin BD debe ser 503; con conexión/esquema disponible debe informar `connected`. Configurar redacción de `/q/*` y códigos de activación en logs de CDN/plataforma/observabilidad. No se ha comprobado el driver Neon contra una instancia remota.

La Raspberry Pi 4 es únicamente un navegador Chromium a pantalla completa que abre `/kiosco` en el dominio real. Generar el código de enrolamiento en un equipo autorizado y abrirlo en ese navegador; la credencial permanece en su cookie HttpOnly. Repetir enrolamiento con `--device <uuid>` para rotarla, o desactivar el registro en una operación administrativa autorizada. No hay servidor de hardware, puerto serial ni motores conectados: el estado visible es Simulador.

Antes de instalarlo: terminar build/E2E y dos pasadas visuales; medir carga, tacto e inactividad en la Pi física y en su red. Comprobar hora del servidor, cookies Secure, TTL, fuente del contenido, limpieza y canje concurrente. La app no puede funcionar sin conexión al servicio para el canje. El cierre local por inactividad oculta datos, pero no puede revocar remotamente un QR durante un corte de red.

Asignar al operador la limpieza periódica mediante `npm run db:cleanup`, la política de backups y la revisión de retención. El repositorio no crea tareas programadas ni recursos externos.
