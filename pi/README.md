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

## Despliegue simulado de la etapa 11

Se ha copiado `pi/` a `/home/ari/ary/pi`, con venv en `/home/ari/ary/venv`.
El entorno `/home/ari/ary/ary.env` es **DEV**, con secreto aleatorio, permisos
0600, dispositivo UUID de prueba y origen `http://127.0.0.1:3000`. No está
emparejado con producción y no incluye secreto de telemetría ni clave Gemini.
No mostrar ese archivo en terminal, logs o informes. `scripts/dev_setup.py`
lo crea de forma exclusiva y se niega a reemplazarlo si ya existe.

```sh
cd /home/ari/ary/pi
/home/ari/ary/venv/bin/python -m unittest
# Prueba breve: carga DEV en memoria, arranca SOLO simulación, llama curl y termina.
/home/ari/ary/venv/bin/python scripts/smoke_bridge.py
sh scripts/diagnose.sh
```

No hay servicios instalados/habilitados ni procesos de puente/voz persistentes
dejados por esta etapa. No ejecutar `--serial` ni cargar el `.ino`: el programa
actual del UNO no se conoce y la placa no está detectada. Las unidades `/opt/ary`
son referencias; no se han copiado a `/etc/systemd` ni se ha usado sudo.

## Modo sin internet

El proceso `voice` es independiente del controlador y **no importa serie ni
reproduce audio**. Escucha solo en `127.0.0.1:8766`, con Host fijo y Origin exacto.
Puede funcionar sin token de hardware para no depender de renovarlo en Vercel
durante un corte. Instalarlo solo en un kiosco con origen de confianza.

```sh
# Instalación ya efectuada en la Pi, sin paquetes globales ni modelos grandes:
/home/ari/ary/venv/bin/python -m pip install --no-cache-dir -r requirements-voice.txt
/home/ari/ary/venv/bin/python scripts/download_models.py
# Elegir el origen EXACTO de la página del kiosco; este es el de pruebas locales.
/home/ari/ary/venv/bin/python -m voice --origin http://127.0.0.1:3002
```

La descarga instala una sola voz `es_MX-ald-medium.onnx` (63.201.294 bytes),
su JSON/MODEL_CARD de `rhasspy/piper-voices` y
`vosk-model-small-es-0.42` (ZIP de 39.817.833 bytes) de alphacephei.com.
Tiene límites de descarga/descompresión y exige 500 MiB disponibles. No descarga
torch. Una descarga fallida conserva `.part` dentro de `models`; reejecutar vuelve
a descargar ese archivo, sin tocar el sistema. Se conserva el ZIP como evidencia.

Endpoints (cabecera `Origin` obligatoria, sin cookies):

| Método y ruta | Entrada | Resultado |
|---|---|---|
| `GET /health` | — | `mode`, `checkedAt`, `piper`, `vosk`, `catalogItems` |
| `POST /speak` | JSON `{"text":"Hola Ary"}` | WAV mono; primero caché, después Piper |
| `POST /cache` | JSON `{"text":"Hola Ary","wav":"base64…"}` | Importa WAV validado, nunca órdenes |
| `POST /transcribe` | WAV mono PCM16, máximo 15 s | JSON `text` con Vosk; no graba archivos |
| `POST /reply` | JSON `{"text":"merengue"}` | Respuesta determinista con ficha/fuente local |

`/health` comprueba conectividad TCP cada ~10 s en segundo plano; el modo puede
ser `unknown` hasta el primer intento. No equivale a disponibilidad del proveedor.
Los modelos se cargan de forma perezosa. Se admite una operación de voz a la vez;
ocupación devuelve 429, entrada inválida 400 y modelo ausente 503.

La web mantiene TTS Sulafat cuando funciona. Solo en kiosco intenta copiar sus
WAV a la Pi para reutilizarlos offline; si falla la API usa voz local y, si esta
también falla, conserva el aviso/respaldo existente. Vosk se utiliza como respaldo
de `/api/voice/ask`; el navegador convierte a WAV16k en memoria. El consentimiento
informa del procesamiento y de la caché de respuestas. No hay micrófono detectado:
el recorrido completo con habla humana y permisos de Chromium sigue pendiente.

La caché de respuestas tiene máximo 64 MiB y siete días, permisos 0700/0600,
clave SHA-256 del texto normalizado y purga en acceso. No guarda micrófono ni
transcripciones, pero el audio de Ary puede repetir datos personales: revisar
retención antes de uso público. Piper no se cachea automáticamente para dar
prioridad al audio real de Ary importado. No se encontraron pregrabaciones WAV/MP3
en `public/`; mientras no se sincronicen, esos textos usan Piper.

### Preparar y sincronizar audios Sulafat

Desde el repositorio en PC/servidor:

```powershell
# Sin red, sin clave, sin llamadas ni escrituras: muestra el plan.
node scripts/voice-assets.ts
# Exporta solo catálogo/textos públicos validados, sin AI.
node scripts/voice-assets.ts --export
powershell -File scripts/sync-voice-assets.ps1
# SOLO en un servidor con clave ya configurada: genera audios, con coste.
# No se ha ejecutado ni se ha solicitado la clave durante esta etapa.
# node scripts/voice-assets.ts --execute
# Tras revisar salida, sincronización explícita:
# powershell -File scripts/sync-voice-assets.ps1 -Execute
```

El plan final tiene 317 fichas y 320 frases (incluye saludo offline). El script no
carga `.env` ni descarga claves de Vercel. Reutiliza `synthesize()` en el servidor
solo con `--execute`. El resultado usa los mismos hashes que `POST /speak`.
Sincroniza exclusivamente `catalog.json` y `voice-cache/*.wav`; no firmware ni
secretos. Reiniciar manualmente voz para recargar el catálogo. Es una instantánea
de archivos locales, no garantiza ocultaciones actuales de producción.

`systemd/ary-voice.service` es una plantilla de **usuario**, no instalada ni
habilitada. Usa `APP_BASE_URL` del env como origen; adaptar ese valor al kiosco
antes de instalarla. No se ha habilitado arranque automático de ningún proceso.
No tiene acceso programado a hardware. El servicio de hardware de referencia
continúa con `--simulate`.

### Verificación y límites

`python -m unittest` no necesita modelos: inyecta sintetizador/reconocedor mock
y prueba HTTP, caché, entradas inválidas, origen, Host y concurrencia.
`scripts/benchmark_voice.py` sí usa los modelos, escribe un WAV sintético y mide
síntesis/RTF/transcripción sin micrófono ni altavoz.
`scripts/verify_voice.py` arranca voz brevemente, ejecuta curl y termina el hijo.

El respaldo web requiere una página ya cargada. No se ha implementado carga
inicial offline del shell Next/Vercel, service worker ni navegador en la Pi.
El origen de producción y su permiso de acceso a loopback/PNA se deben comprobar
en Chromium real. El modo local es español. Las dos pasadas visuales están
pendientes por `spawn EPERM` en el entorno actual.

Detalles, evidencia y pendientes: [informe](../docs/hardware/informe-etapa11.md),
[arquitectura de voz](../docs/hardware/voz-local-etapa11.md) y
[checklist Arduino](../docs/hardware/arduino-checklist.md).

## Ari habla y se mueve (firmware `ari_control`, 2026-11-13)

- Firmware real: `firmware/ari_control/ari_control.ino` (hex compilado al lado). Mismos pines que el sketch original del usuario (`firmware/ari_original/`, con copia binaria de la placa): 9 ala derecha, 10 ala izquierda en espejo, 11 pico; rango 30–60°.
- Arranca quieto con los servos sueltos; no se mueve hasta recibir una orden. Imprime `ARI LISTO reinicio=<MCUSR>` (4 = caída de voltaje).
- `STATE speaking` / `GESTURE talk`: el pico abre y cierra (30–60°) y las alas aletean suave (30–45°, a un tercio de velocidad); cada 4–9 s el ala derecha se extiende rápido hasta 60°, aguanta 0,7 s y vuelve, como si señalara algo (`SENAL` lo hace a mano; `handoff_qr` la deja extendida). Sirve igual para la voz de Gemini y para Piper sin internet, porque ambas suenan por el mismo `<audio>` del kiosco, que marca `speaking` al reproducir y vuelve a `listening`/`idle` al terminar.
- Órdenes manuales para pruebas: `tools/ari_cmd.py PARAR | REPOSO | "ALETEAR 3000" | "HABLAR 3000" | "PICO 3000" | SENAL | SALUDAR | ESTADO`.
- Cargar desde la Pi: `avrdude -p atmega328p -c arduino -P /dev/serial/by-id/usb-Silicon_Labs_CP2102_* -b 115200 -U flash:w:ari_control.hex:i`.
- Puente real: `python -m bridge --serial /dev/serial/by-id/usb-Silicon_Labs_CP2102_... --local-state --queue ...`. Espera hasta 4 s al banner del firmware antes del `STATE idle`.

### Sin internet (`--local-state`, opt-in)
Sin internet el kiosco no puede pedir el token firmado a Vercel. Con `--local-state` el puente acepta, solo en loopback y solo desde el `Origin` exacto permitido, órdenes `{"type":"state"}` sin token (nunca gestos ni ángulos). El kiosco las reenvía cada 1,5 s; si dejan de llegar 4 s, el puente deja de enviar PING y el firmware vuelve al reposo a los 3 s.

## Ari sin pantalla (`headless`, Raspberry Pi OS Lite)

Ari funciona sin navegador: micrófono USB → Vosk → fichas locales → voz (caché de Gemini o Piper) por el jack → mientras suena, `STATE speaking` al Arduino (pico, alas suaves y señal con el ala). No guarda audio ni conversaciones; con `--verbose` solo se muestran en pantalla.

```sh
cd ~/ary/pi
../venv/bin/python -m headless --text "háblame del merengue" --verbose   # un turno, sin micrófono
../venv/bin/python -m headless --wav ../piper-test.wav --verbose        # transcribe un WAV y responde
../venv/bin/python -m headless --greet --serial /dev/serial/by-id/usb-Silicon_Labs_CP2102_*   # escucha y se mueve
```

- Mientras Ari habla se descarta lo que entra por el micrófono (no se escucha a sí mismo); frases de una palabra se ignoran.
- Sin `--serial` no hay movimiento (solo registra estados). Con `--serial` no ejecutar a la vez el puente: comparten el puerto.
- Servicio: `systemd/ary-headless.service` (no habilitado). Requiere micrófono USB.
- Pendiente: modo con internet (Gemini a través de Vercel) con identidad de dispositivo; hoy responde siempre con las fichas locales.
- Probado en la Pi el 2026-11-13 con `--text` y `--wav` (≈10 s incluyendo la carga de Piper la primera vez; en modo continuo el modelo queda cargado). Micrófono y movimiento sin probar: falta micrófono y el Arduino estaba desconectado.
