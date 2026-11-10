# Despliegue de Vercel y Raspberry Pi

Guía de operación de etapa 4A, actualizada para la preparación de etapa 5. Sigue primero [DEPLOY_CHECKLIST](DEPLOY_CHECKLIST.md) para variables, migraciones y primer administrador. Los bloqueos históricos se conservan en sus informes; esta guía no acredita hardware, Neon ni despliegue real.

## 1. Preparar Vercel

Node **24.x LTS**, Next.js 16.4.5 y PostgreSQL Neon mediante Pool WebSocket. `vercel.json` fija **iad1**: elegir Neon **us-east-1**. Preview usa BD y secretos separados; jamás la BD de producción. Usar el origen HTTPS exacto en `APP_BASE_URL`, incluidas las previews.

| Variables | Configuración |
| --- | --- |
| `APP_BASE_URL`, `DATABASE_URL` | Origen HTTPS y PostgreSQL persistente |
| `AUTH_SECRET`, `SESSION_ENCRYPTION_KEY`, `RATE_LIMIT_SALT` | Secretos independientes, mínimo 32 caracteres |
| `EMAIL_DRY_RUN` | Mantener `true` durante aceptación |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Tras verificar remitente y autorizar correo real |
| `RESEND_WEBHOOK_SECRET`, `ADMIN_NOTIFICATION_EMAIL`, `CRON_SECRET` | Webhook, aviso administrativo y dispatcher |
| `GEMINI_API_KEY`, `AI_MODEL` | Clave exclusivamente de servidor y `gemini-3.8-flash` por defecto |
| `AI_SESSION_PER_MINUTE`, `AI_GLOBAL_PER_MINUTE` | 6 y 30 por defecto |
| `ROBOT_DEVICE_AUTH_SECRET` | HMAC de telemetría, mínimo 32 caracteres |
| `ROBOT_BRIDGE_SECRET` | HMAC distinto para tokens locales, mínimo 32 caracteres, compartido con la Pi |
| `VISITOR_SESSION_TTL_HOURS`, `QR_HANDOFF_TTL_SECONDS` | 24 h y 120 s por defecto |
| `ANALYTICS_RETENTION_DAYS` | 90, pendiente de revisión jurídica |
| `FEATURE_ENABLE_MARKETING`, `FEATURE_ENABLE_PARTNER_SHARING` | `false` durante aceptación |

`ROBOT_DEVICE_ID` pertenece solo a la Pi. `PGLITE_DATA_DIR` solo se usa en desarrollo. Las claves se mantienen fuera de `NEXT_PUBLIC_*`, archivos estáticos y logs.

En el equipo administrativo con las variables de la BD de destino, ejecutar antes de servir la nueva aplicación.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run db:migrate -- --env-file .env.production.local
npm run build
```

El journal incluye 0000–0003; 0002 añade `ai_usage`, `robot_events` y `robot_commands`, y 0003, personal/proveedores. El migrador transaccional es idempotente y se ejecuta desde el equipo del propietario, nunca en el build. Revisar backups y recuperación antes de migrar una BD real. Los rollbacks son destructivos y exclusivos de pruebas autorizadas. `db:seed -- --env-file .env.production.local` carga contenido cultural con fuentes verificadas por HTTP y `demo=false`; exige revisión editorial. El seed de identidades ficticias `demo:seed` está bloqueado fuera de local.

Desplegar mediante el flujo autorizado del proyecto. Comprobar `/api/health` sobre el dominio publicado. Debe responder 200, `checks.database=connected` y poder leer la tabla nueva. Sin BD responde 503. `ai=configured_unverified` expresa configuración. `robot=simulator` mantiene la distinción respecto al hardware.

Los correos inmediatos se intentan después del commit de su petición, con timeout HTTP de 10 s. `vercel.json` programa dispatcher a las 13 UTC y limpieza a las 14 UTC, diariamente; requieren despliegue y `CRON_SECRET`. Enlaces de 15 minutos se descartan caducados. El catch-all de IA/correo y el dispatcher permiten 180 s; webhook, 30 s. Confirmar plan/Fluid Compute y ejecución real de los crons antes de operar. La política de backups corresponde al propietario.

## 2. Preparar Raspberry Pi OS

Usar Raspberry Pi OS de escritorio de 64 bits con labwc/Wayland y reloj sincronizado. Crear usuario de escritorio dedicado `ary`. En `sudo raspi-config`, elegir arranque al escritorio con autologin de ese usuario y desactivar Screen Blanking. El arranque de Chromium se vincula a la sesión gráfica. [Guía oficial de kiosco](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/).

El operador instala los paquetes oficiales y copia el release a `/opt/ary` mediante su canal habitual. Conceder a `ary` propiedad de la carpeta del venv antes de crearlo.

```sh
sudo apt update
sudo apt install python3 python3-venv chromium wlr-randr
sudo mkdir -p /etc/ary /var/lib/ary /opt/ary/venv
sudo chown ary:ary /var/lib/ary /opt/ary/venv
sudo usermod -aG dialout ary
sudo -u ary python3 -m venv /opt/ary/venv
# Solo para serie real
sudo -u ary /opt/ary/venv/bin/python -m pip install pyserial
cd /opt/ary/pi
/opt/ary/venv/bin/python -m unittest
```

Las pruebas crean SQLite temporal bajo `.cache/` del release. Ejecutarlas en una copia escribible o conceder escritura de esa carpeta durante aceptación. El servicio solo escribe su cola en `/var/lib/ary`.

Para rotar la pantalla usar Control Centre → Displays y guardar orientación para el usuario. Verificar conector con `wlr-randr`. Rotación temporal con `wlr-randr --output HDMI-A-1 --transform 90`, sustituyendo el nombre observado. Comprobar el mapeo táctil. Apagado/encendido manual desde la sesión gráfica con `wlr-randr --output HDMI-A-1 --off` y `--on`. Screen Blanking del escritorio es distinto de `consoleblank` de la consola. [Configuración oficial de Raspberry Pi](https://www.raspberrypi.com/documentation/computers/configuration.html).

Para ocultar el cursor en Chromium de la Pi, crear `~/.config/ary/cursor/manifest.json`, sustituyendo el origen por el real.

```json
{
  "manifest_version": 3,
  "name": "Ary kiosk cursor",
  "version": "1.0",
  "content_scripts": [{
    "matches": ["https://ORIGEN-REAL/kiosco*"],
    "css": ["cursor.css"]
  }]
}
```

Crear `cursor.css` en esa carpeta con `html, body, * { cursor: none !important; }`. Añadir `--load-extension=%h/.config/ary/cursor` al `ExecStart` del servicio de usuario de Chromium y recargar el servicio. Comprobar que esa versión de Chromium admite extensión local. El operador conserva cursor/foco accesibles al salir a mantenimiento. Las utilidades X11 requieren comprobar compatibilidad con Wayland.

## 3. Activación y puente

Desde el equipo administrativo ejecutar `npm run kiosk:enroll -- --label "Pi recepción"`. Abrir la URL privada en Chromium de la Pi y pulsar «Activar este kiosco». La cookie `ary_kiosk` es HttpOnly y dura 30 días. El código de activación dura diez minutos y es de uso único. Evitar incluirlo en evidencia.

Consultar `public_device_id` del registro enrolado en `kiosk_devices` y copiarlo a `ROBOT_DEVICE_ID` de la Pi. El ID interno impreso por el CLI sirve para rotación y es distinto del público. Telemetría requiere un dispositivo activo y credencial vigente. Renovar mediante enrolamiento del mismo ID interno antes de caducar.

Crear `/etc/ary/bridge.env`, propietario root y permisos 0600. Systemd lo lee antes de cambiar al usuario de servicio. Introducir los secretos mediante un editor seguro.

```dotenv
APP_BASE_URL=https://ORIGEN-REAL
ROBOT_DEVICE_ID=UUID-PUBLICO-DEL-DISPOSITIVO
ROBOT_DEVICE_AUTH_SECRET=SECRETO-TELEMETRIA
ROBOT_BRIDGE_SECRET=SECRETO-PUENTE
```

Ambos secretos coinciden con sus variables privadas en Vercel y son distintos entre sí. La clave de Gemini permanece en Vercel. Para rotar el secreto de puente, reiniciar servicio y recargar kiosco para renovar su token de 120 s.

```sh
sudo install -m 0644 /opt/ary/pi/systemd/ary-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ary-bridge
sudo systemctl status ary-bridge
```

El servicio arranca con `--simulate`. Para sensores de consola, detenerlo y ejecutar interactivamente `python -m bridge --simulate` con las mismas variables, luego escribir `presence 1`. Mantener una sola instancia en 8765. Para serie, cargar/calibrar firmware y cambiar `ExecStart` mediante un override a `... -m bridge --serial /dev/ttyACM0 --queue /var/lib/ary/events.sqlite3`. Después de un fallo de ACK, revisar conexiones y reiniciar explícitamente. El error queda enclavado y se detienen los envíos.

El puente escucha exclusivamente en `127.0.0.1:8765`. Comprueba Origin, Host y token, rechaza campos extra y grados. SSE usa Authorization en cabecera. Las reacciones a presencia y estado se envían por loopback. Protocolo, firmware y watchdog están en [pi/README](../pi/README.md).

## 4. Chromium y acceso a loopback

Comprobar versión y `chrome://policy`. En Chromium compatible con las políticas divididas de red local, crear `/etc/chromium/policies/managed/ary-loopback.json` con únicamente el origen real.

```json
{"LoopbackNetworkAllowedForUrls":["https://ORIGEN-REAL"]}
```

Versiones anteriores pueden requerir `LocalNetworkAccessAllowedForUrls` con ese mismo origen exacto. Es una política más amplia. El operador debe comprobar cuál reconoce su versión. La política concede al origen seleccionado acceso a loopback, y la app limita adicionalmente `connect-src` para `127.0.0.1:8765` a `/kiosco`. El puente comprueba origen/token. [Política de Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/components/policy/resources/templates/policy_definitions/LocalNetworkAccessSettings/LoopbackNetworkAllowedForUrls.yaml).

Chromium reciente condiciona las peticiones de páginas HTTPS a loopback HTTP/WS a los permisos locales y relaja mixed content en ese caso. Comprobarlo en la versión física de la Pi. Si se bloquea, actualizar por el canal oficial o mantener el modo sin puente hasta validar la política. Evitar desactivar seguridad web, certificados o aislamiento globalmente. [Acceso local en Chrome](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access).

## 5. Chromium al arrancar

Como usuario `ary`, crear `~/.config/ary/kiosk.env` con `ARY_KIOSK_URL=https://ORIGEN-REAL/kiosco`. Copiar `pi/systemd/ary-kiosk.service` a `~/.config/systemd/user/` y ejecutar `systemctl --user daemon-reload`.

Añadir a `~/.config/labwc/autostart`, conservando su contenido.

```sh
systemctl --user import-environment WAYLAND_DISPLAY DISPLAY XDG_RUNTIME_DIR
systemctl --user start ary-kiosk.service
```

Se usa el perfil persistente `~/.config/ary/chromium` para conservar la cookie. La primera activación debe usar ese perfil, abriendo Chromium con `--user-data-dir` y la URL privada antes de iniciar el servicio. La app limpia sus datos operativos al finalizar. El perfil es exclusivo del kiosco. Para mantenimiento, `systemctl --user stop ary-kiosk.service`. Probar reinicio completo antes de instalarlo.

## 6. Aceptación y diagnóstico

1. Health HTTP 200, reloj sincronizado y cookies Secure. Falta de BD debe devolver 503.
2. Kiosco frío muestra «Comprobando conexión…» y reintenta offline a 1/2/4/8/15 s. El modo demo de dispositivo aparece tras `/api/kiosk/me`.
3. Sin puente, recomendaciones, chat demo y QR autorizado continúan. Se indica «Robot: no conectado» y simulador.
4. Con simulador, presencia muestra bienvenida y saludar sin iniciar sesión. `thinking` espera al chat y `speaking` muestra su respuesta de texto.
5. Verificar SSE/POST desde origen permitido, rechazos de origen/token y ausencia de escucha en otras interfaces.
6. Telemetría HMAC actualiza `lastSeenAt` y conserva `hardware=simulated` cuando corresponde. El polling cloud entrega mantenimiento allowlist una vez.
7. Completar kiosco → QR → móvil, inactividad, cancelación, chat con fuentes/derivación, consentimiento B2B y TXT, manteniendo correo dry-run.
8. Ejecutar E2E y dos pasadas visuales del release final. Medir tacto, carga y ancho real en Pi física.

Los logs omiten tokens y cabeceras. Errores de cloud usan `cloud_unavailable`. La cola SQLite conserva solo estado/salud y se drena con el mismo `eventId` y nonce nuevo. Firmware, arranque y políticas de Chromium requieren validación física.
