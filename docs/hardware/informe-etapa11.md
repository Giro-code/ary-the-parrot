# Informe etapa 11 — Ary la Cotorra

Fecha: 13 de noviembre de 2026. Trabajo local en `D:\Ary The Parrot` y despliegue
por `ssh -o BatchMode=yes ari` dentro de `/home/ari/ary`. **Sin push, llamadas
Gemini, firmware cargado, puertos serie abiertos ni movimientos de servos por
esta implementación.**

## Resultado y estado de entrega

| Fase | Resultado | Verificación / pendiente |
|---|---|---|
| 11A, puente | Copiado a Pi, venv y pyserial instalados, env DEV 0600 | 15 tests iniciales y curl simulado aceptado |
| 11B, voz | Piper/Vosk instalados, modelos descargados, servicio loopback y respaldo web implementados | 25 tests Python, 305 tests web; WAV, STT y caché reales en Pi; UI pendiente por permisos |
| 11C, Arduino | Checklist y revisión estática del sketch de referencia | No detección inicial del UNO; inspección física y calibración pendientes |
| Git | Cambios preparados con allowlist por fase | **No se pudieron crear commits**: `.git` es solo lectura en este entorno |

La implementación está desplegada para pruebas manuales. No está presentada
como validada visualmente ni lista para operación física o kiosco público.

## Contexto leído y alcance

Se leyó el handoff de Downloads, AGENTS.md, el puente, tests, firmware y unidades
systemd originales de `pi/`, además de protocolo, adaptador de hardware, TTS del
servidor y hook de voz. Antes de cambiar Next se leyó la referencia local de Route
Handlers en `node_modules/next/dist/docs/`. No se utilizó Gemini para implementar,
analizar, revisar ni generar audios.

Se conservaron los archivos ajenos existentes y los que aparecieron durante el
trabajo, incluidos ZIP/capturas y otros directorios de firmware/herramientas.
No se ejecutaron esas herramientas ni se modificaron esos firmwares. La copia
del árbol `pi/` es almacenamiento de archivos, no programación del Arduino.

## Despliegue simulado

- `/home/ari/ary/venv`: Python 3.13.5, pyserial 3.5.
- `/home/ari/ary/pi`: código y scripts de diagnóstico/verificación.
- `/home/ari/ary/events.sqlite3`: cola del simulador.
- `/home/ari/ary/ary.env`: creado exclusivamente, permiso comprobado **600**,
  secreto aleatorio prefijado DEV y UUID de dispositivo de prueba. Origen
  `http://127.0.0.1:3000`; sin clave AI ni secreto de telemetría. No se ha impreso,
  copiado al repo ni emparejado con Vercel.
- `python -m bridge --simulate --dev --queue /home/ari/ary/events.sqlite3`
  arrancó brevemente, respondió y terminó. `--dev` permite el origen localhost
  elegido, sin omitir firma ni comprobación de origen.

Salidas reales iniciales:

```text
Ran 15 tests in 2.441s
OK
Ary bridge listening on 127.0.0.1:8765
Simulador · STATE thinking
curl POST /command: 0 {"accepted": true}
```

El [diagnóstico guardado](diagnostico-2026-11-13.txt) se obtuvo con
`pi/scripts/diagnose.sh`: solo inventario, sin abrir dispositivos. Mostró hubs USB,
ningún puerto Arduino, Headphones y HDMI de reproducción, y lista de captura vacía.
La comprobación se refiere a ese momento, no identifica el sketch instalado.

## Voz local y pruebas reales

Paquetes principales instalados: `piper-tts==1.8.0` (wheel aarch64),
`vosk==0.3.45`, `onnxruntime==1.32.0`. El listado completo está en
[evidencia-etapa11.txt](evidencia-etapa11.txt). No se instaló torch, apt upgrade,
Chromium ni modelos grandes.

| Archivo oficial | Tamaño descargado | SHA-256 |
|---|---|---|
| es_MX-ald-medium.onnx | 63.201.294 bytes | `019b3803293c93e34a206dd2e53a3889209a514e786fd7144f7b70196c579b63` |
| es_MX-ald-medium.onnx.json | 4.878 bytes | `5a71498158e04afc8099bfd019c7e87c68eb9d042505a2b1a87e5c1ac2b1a61d` |
| vosk-model-small-es-0.42.zip | 39.817.833 bytes | `09b239888f633ef2f0b4e09736e3d9936acfd810bc65d53fad45261762c6511f` |

Fuentes: [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_MX/ald/medium)
y [Alpha Cephei Vosk](https://alphacephei.com/vosk/models). Se conservan JSON,
MODEL_CARD y ZIP en la Pi; no se incluyen modelos en Git.

Servicio `python -m voice --origin http://127.0.0.1:3002` probado solo en loopback,
sin hardware. `/speak` prioriza caché sobre Piper, `/transcribe` usa Vosk en memoria,
`/reply` devuelve fichas locales, `/health` comprueba conectividad cada ~10 s.
Host/Origin exactos, PNA/CORS restringidos, límites de audio/cuerpo y una operación
concurrente. Una prueba TCP positiva no garantiza disponibilidad del proveedor.

Verificación final por curl en la Pi:

```text
Ran 25 tests in 4.023s
OK
GET /health {"mode": "online", ... "piper": true, "vosk": true, "catalogItems": 317}
POST /speak WAV bytes: 75308
POST /cache {"cached": true}
POST /speak repeated: X-Ary-Voice: cache (synthetic Piper fixture, not Gemini)
Temporary voice process stopped; no systemd unit enabled.
```

`/reply` devolvió «El merengue reúne música y baile de origen dominicano», con
fuente/editor de su ficha. Los tests sin modelos cubren prioridad de caché,
entrada corrupta, transcripción mock, origen/Host, concurrencia y transiciones
de conectividad simuladas. No se desconectó físicamente la red de la Pi.

Frase sintetizada: «Hola, soy Ary, la cotorra. Vamos a descubrir la música y la
comida de República Dominicana.» Última medición registrada:

| Medida | Resultado |
|---|---|
| Síntesis incluyendo carga inicial | 4,519 s |
| Duración WAV | 7,674 s |
| Formato | Mono PCM16, 22.050 Hz |
| Real-time factor | **0,589** |
| Transcripción Vosk incluyendo carga inicial | 3,891 s |
| Texto reconocido | «hola soy gary la toba vamos a descubrir la música y la comida de república dominicana» |

Vosk se ejecuta y reconoce contenido, pero falla en el nombre y «cotorra».
No se afirma precisión suficiente para visitantes. El WAV es sintético, no una
prueba de micrófono, ruido ambiental ni jack/altavoz. No se reprodujo audio.

## Web, catálogo y pregeneración

El kiosco intenta guardar los WAV remotos en la Pi; si la API TTS falla o no hay
red, intenta voz local y conserva el respaldo previo si ambas fallan. También
incluye transcripción local y consulta determinista de fichas en sesiones locales,
sin guardado ni handoff QR. Caché acotada a 64 MiB/siete días, sin grabaciones del
visitante, con advertencia de que la respuesta de Ary puede repetir información
personal. Ver [arquitectura y límites](voz-local-etapa11.md).

`node scripts/voice-assets.ts` fue ejecutado **en dry-run**:

```json
{"mode":"dry-run","catalogItems":317,"phrases":320,"providerCalls":0}
```

Se exportó y copió el catálogo español público validado. La instantánea no prueba
el estado de publicaciones/ocultaciones actuales de producción. No se encontraron
pregrabaciones WAV/MP3 en `public/`; los saludos de texto se mantienen preparados
para pregeneración. No hay una caché real Sulafat instalada: la prueba de caché
es un fixture Piper explícito.

La generación con `--execute` reutiliza el TTS del servidor; solo debe ejecutarse
allí con su clave ya configurada y autorización de gasto. No se usó ni solicitó
ninguna clave Vercel/Gemini. `scripts/sync-voice-assets.ps1` también fue probado
en dry-run, sin copia ni conexión. La exportación y copia manual del catálogo
efectuadas antes fueron independientes de ese dry-run.

Comprobaciones locales finales:

```text
npm run typecheck   → exit 0
npm run lint        → exit 0, cero warnings
npm test            → 24 archivos, 305 tests pasados
git -c core.whitespace=cr-at-eol diff --check → exit 0
```

La revisión visual requerida por AGENTS y `visual-review-loop` **está pendiente**:
`node scripts/e2e-server.ts` falló con `spawn EPERM`; el arranque directo mediante
`startServer` también terminó con ese error. No se hicieron dos pasadas ni se
generaron capturas actuales. Tampoco se verificó HTTPS→loopback/PNA en Chromium
de la Pi. El respaldo requiere la web ya cargada: el arranque/recarga completa
sin red del shell Next/Vercel aún no está implementado.

## Fallos, correcciones y bloqueos

- `rg` no estaba disponible; se usó inventario/Select-String de PowerShell.
- La primera instalación por SSH sufrió conexiones reiniciadas; se repitió en
  segundo plano con log local sin secretos. El venv confirmó paquetes instalados.
- Primera descarga Vosk agotó timeout; segundo intento completado, con tamaño y
  hash registrados. No se alteraron particiones ni bootloader.
- Se corrigió el diagnóstico de ruta por defecto (precedencia de awk), el uso de
  refs durante render detectado por lint y los bloqueos de envío offline del chat.
- PowerShell envolvió stderr de unittest como NativeCommandError aun con tests
  OK. La evidencia conserva las salidas reales y explica esa diferencia; no se
  interpreta ese envoltorio como tests fallidos.
- Hubo un timeout SSH al intentar repetir el cierre; se reconectó correctamente.
  El último `ss -ltn` no mostró listeners en **8765 ni 8766**.
- `.git/index.lock: Permission denied` impidió `git add` y `git commit`. No se
  alteraron permisos ni se usó otra vía para escribir en Git. No se ha hecho push.

## Espacio y permisos finales

Primera lectura: 4,5 GB libres. Antes de descargar voz: 2,6 GB libres; por entonces
`/home/ari/ary` ocupaba unos 13 MB. La variación grande ya había ocurrido fuera del
directorio de esta implementación; no se investigó ni borró contenido ajeno.

Última lectura real por SSH, tras terminar las pruebas:

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/mmcblk0p2  6.8G  4.2G  2.3G  66% /
366M /home/ari/ary
600  /home/ari/ary/ary.env
```

No se instalaron ni habilitaron unidades systemd. Los procesos temporales de
puente/voz terminaron; la comprobación final de sockets confirmó ambos puertos
sin listener. La unidad opcional de voz es una plantilla de usuario; la unidad
de hardware de referencia sigue usando `--simulate`.

## Sudo y commits pendientes

`sudo -n true` devolvió `sudo: a password is required`. No se intentó sudo
interactivo. **No hay comandos sudo necesarios pendientes para lo implementado**:
`python3 -m venv` funcionó y toda la instalación se realizó como ari. No se hizo
`apt upgrade`. No instalar/habilitar servicios de arranque como parte de este cierre.

Se dejó [commits-etapa11.ps1](commits-etapa11.ps1) con tres commits pequeños, mensajes
en español y la línea en blanco más `Co-Authored-By: Codex <noreply@openai.com>`.
Su dry-run fue comprobado. En una terminal con escritura autorizada en `.git`,
revisar el diff y ejecutar:

```powershell
powershell -NoProfile -File docs/hardware/commits-etapa11.ps1 -Execute
```

Tiene allowlist explícita, rechaza cambios ya staged y no añade otros firmwares,
herramientas ni archivos ajenos. No contiene push. Si el trabajo continúa antes
de ejecutarlo, revisar de nuevo los archivos incluidos para no agrupar cambios
posteriores accidentalmente.

## Próximos pasos que requieren al usuario

1. Conectar UNO con cable de datos, con servos sin energía; ejecutar solo el
   inventario USB y aportar el sketch/esquema existente. Seguir el
   [checklist Arduino](arduino-checklist.md). No abrir serie ni cargar firmware.
2. Preparar fuente externa regulada de 5 V para cinco SG90 (≥3 A recomendado como
   punto inicial), masa común, corte accesible y mapa de cableado real. Calibración
   futura requiere autorización específica y se hará de uno en uno.
3. Conectar micrófono USB y verificar captura con `arecord -l`; después probar
   Vosk con voz humana. Revisar errores del nombre propio, ruido y latencia.
4. Disponer de navegador/servidor local con permisos de proceso para las dos
   pasadas visuales, configurar origen exacto y validar PNA/loopback en Chromium.
   No cambiar el env DEV por secretos productivos sin emparejamiento revisado.
5. Decidir cuándo autorizar pregeneración Sulafat y sincronización. No se ha
   gastado cuota AI en esta etapa. Si se necesita arranque completo offline,
   preparar una tarea explícita para alojar/cachear el shell del kiosco.
6. Completar los commits desde una terminal con escritura en Git. No hacer push.
