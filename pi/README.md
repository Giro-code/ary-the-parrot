# Puente y servicio de referencia de Ary

Python 3.11 o posterior. El simulador y HTTPS/SSE usan exclusivamente la biblioteca estándar. Para serie real, el operador instala `pyserial` en un entorno virtual. Firmware y puertos se calibran en banco antes de energizar motores. **Este código no se ha probado en hardware real.**

```sh
cd pi
python -m unittest
python -m bridge --simulate --queue /var/lib/ary/events.sqlite3
# En desarrollo de consola se permite añadir --dev y escribir presence 1 / presence 0.
# Serie, después de calibrar y cargar el firmware
python -m bridge --serial /dev/ttyACM0 --queue /var/lib/ary/events.sqlite3
```

Variables privadas de la Pi en un archivo de entorno de permisos 0600. `APP_BASE_URL` es el origen exacto del sitio, `ROBOT_DEVICE_ID` el `public_device_id` del kiosco activado, `ROBOT_BRIDGE_SECRET` coincide con Vercel y `ROBOT_DEVICE_AUTH_SECRET` firma telemetría. Son secretos distintos y de al menos 32 caracteres. La clave de Gemini pertenece al servidor de Vercel.

## Protocolo local

El servicio escucha exclusivamente en `127.0.0.1:8765`. SSE + POST cumple el mismo contrato lógico que WebSocket.

- `GET /events`, con `Authorization: Bearer <token>` y `Origin` exacto, transmite `data: {"type":"hardware","status":"simulated"}\n\n`, `ok` o `error` y eventos `{"type":"sensor","sensor":"presence","value":true}`.
- `POST /command` lleva el mismo token y `{"type":"state","state":"thinking"}` o `{"type":"gesture","name":"ponder"}`. Se permiten 8 comandos/s globales, cuerpos de 1024 bytes y cuatro conexiones SSE. Los grados y campos extra se rechazan.
- El kiosco obtiene el token desde `/api/kiosk/bridge-token` mediante su cookie HttpOnly. HMAC-SHA256 sobre el payload base64url, firma base64url, separador punto. Claims `aud=ary-bridge`, `deviceId`, `origin`, `iat`, `exp` máximo 120 s y `jti`. El puente comprueba firma, dispositivo, origen, audiencia y caducidad. Cierra SSE al caducar y el kiosco solicita otro token. El token permanece en memoria y cabeceras.
- En producción se permite exclusivamente `APP_BASE_URL`. `--dev` añade orígenes HTTP localhost/127.0.0.1, que también deben coincidir con el origen firmado. Host fijo y CORS restringido evitan DNS rebinding. Preflight PNA solo para orígenes permitidos. El navegador necesita la política de acceso local descrita en la guía de despliegue.
- Presencia despierta la bienvenida. El servicio no crea sesiones, graba audio ni identifica personas.

## Serie y seguridad física

115200 baudios, ASCII, líneas de máximo 47 caracteres. `STATE <state>\n`, `GESTURE <name>\n` y `PING\n` reciben `ACK STATE <state>\n`, `ACK GESTURE <name>\n` y `ACK PING\n`. Sensor entrante `SENSOR presence 1\n` o `0`. El firmware emite ACK antes de actualizar destinos. El puente exige ACK de `STATE idle` al arrancar y ACK en 800 ms para cada operación. Un fallo queda enclavado, se informa como error y se interrumpe el envío. Recuperación mediante revisión del cableado y reinicio explícito del servicio. No hay reintentos automáticos de movimientos. PING cada segundo mientras hay kiosco activo mantiene el watchdog.

Estados y gestos permitidos coinciden con `src/robot/protocol.ts`. `idle/offline → rest`, `welcome → wave/rest`, `listening → attentive/rest`, `thinking → ponder/rest`, `speaking → talk/rest`, `handoff_qr → point/rest`, `error → stop`, `maintenance → rest/stop`.

El sketch `firmware/ary_servos/ary_servos.ino` usa Arduino Uno y Servo.h. Cabeza pan/tilt, pico y alas tienen límites fijos y suavizado de hasta 2 grados/20 ms. Watchdog de 3 s vuelve al reposo y luego suelta el par. PIR con antirrebote de 250 ms. Calibrar límites por mecanismo, fuente externa dimensionada, masa común, tope físico y parada de alimentación accesible. Adaptar a ESP32 exige revisar librería Servo y pines. Ningún navegador fija ángulos.

## Telemetría y mantenimiento

`ary_robot.py` firma HTTPS saliente. Canonical de firma son seis líneas sin salto final `METHOD`, `PATH`, `public_device_id`, timestamp UNIX en segundos, nonce y SHA-256 hexadecimal de los bytes exactos del cuerpo UTF-8. Cabeceras `X-Ary-Device`, `X-Ary-Timestamp`, `X-Ary-Nonce`, `X-Ary-Signature` hexadecimal. Se rechazan timestamps fuera de ±60 s y nonces repetidos. Cada reintento conserva `eventId` y genera un nonce nuevo. No se siguen redirecciones.

La cola SQLite conserva hasta 1000 eventos de estado/salud, sobrevive al reinicio y se vacía tras aceptación. No contiene conversaciones ni sensores individuales. El simulador informa `hardware=simulated`. `lastSeenAt` solo se actualiza al recibir eventos autenticados nuevos.

`GET /api/robot/commands` es secundario y entrega una sola vez comandos `maintenance/rest` o `maintenance/stop` no caducados de `robot_commands`. El operador autorizado puede insertarlos en BD con `device_id` interno y TTL breve. No hay endpoint público de inserción. Entrega es at-most-once, sin ACK de ejecución física. Las reacciones a presencia y estados van por loopback.

`python -m ary_robot --simulate` permite verificar solo telemetría/polling, sin levantar el puente. No ejecutar ambos procesos de telemetría a la vez para el mismo dispositivo.
