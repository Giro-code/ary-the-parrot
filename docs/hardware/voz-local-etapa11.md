# Voz local: arquitectura y límites de la etapa 11

`Kiosk → AryChat → useAryVoice → local-voice.ts → 127.0.0.1:8766`

El objetivo es conservar la interacción del kiosco cuando falla la voz remota o
internet, utilizando el diseño existente. El componente conserva modos voz/texto,
consentimiento, silencio, interrupción y aviso de error. No se añade otro shell
ni se cambian estilos. Los estados nuevos son disponibilidad local, sesión local,
ficha local, consentimiento offline y error del respaldo. Las fichas locales no
permiten guardado ni QR con identificadores inventados como registros de la BD.
El carrusel conserva una fuente legible y los mismos tamaños adaptables.

## Separación y confianza

- Hardware continúa en `127.0.0.1:8765`, autenticación existente, solo simulación
  en este despliegue. No se ha modificado el firmware.
- Voz escucha en `127.0.0.1:8766`, Host fijo y Origin exactamente configurado.
  No tiene comandos de hardware. CORS/PNA restringidos, sin cookies ni tokens de
  producción. Se permite la operación de voz por origen porque el token de
  hardware vence a los 120 s y no se puede renovar offline. Este servicio solo
  debe usarse con un origen de kiosco de confianza. No exponerlo en la LAN.
- Un único trabajo de voz concurrente; cuerpos y audio acotados. El servidor no
  reproduce audio, no captura micrófono, no escribe transcripciones ni conversaciones.
- La disponibilidad de internet es una conexión TCP cada ~10 s a
  `www.google.com:443`, timeout 2 s; no demuestra que Gemini o Vercel funcionen.
  Si TTS remoto falla aunque esa prueba sea positiva, se intenta igualmente voz local.

## Respuestas, caché y privacidad

El catálogo exportado contiene 317 fichas españolas validadas por la herramienta
local existente, con fuente y editor. Es una instantánea de `candidates.json`,
no una consulta a publicaciones/ocultaciones actuales de producción. Su estado
`draft` de investigación no se usa como publicación: se aplica la misma validación
completa previa que el importador del catálogo. Revisar y volver a sincronizar
cuando cambien datos; no se ha modificado la BD de producción.

La búsqueda offline es léxica, determinista y devuelve una ficha, no genera
afirmaciones nuevas ni sustituye indicaciones de autoridades. Los IDs son UUID
deterministas exclusivos de la instantánea local. No sirven para guardado o QR.
No se descubrieron WAV/MP3 pregrabados en `public/`; se conservan los textos
existentes de saludo y se deja preparado su audio Sulafat. Sin un audio importado,
Piper utiliza otra voz española, no imita ni clona Sulafat.

En kiosco, cada WAV remoto recibido se intenta guardar en la Pi antes de
reproducirlo (máximo 2 s para esa copia). La caché usa SHA-256 del texto con
espacios normalizados. No se guardan texto de usuario ni micrófono, pero el WAV
de la respuesta de Ary puede contener contenido personal repetido por el modelo:
el consentimiento lo informa. Caché: directorio 0700, archivos 0600, máximo
64 MiB y siete días, purgada al siguiente acceso. La persistencia es best effort:
fallo de puente o interrupción impide garantizar copia de todos los audios.
La clave no diferencia modelo/voz; una importación nueva para el mismo texto
reemplaza la versión anterior. Invalidar audios al cambiar el estilo de voz.

`POST /speak` prueba caché antes de Piper; Piper no rellena esa caché, para que
los audios Sulafat sincronizados tengan prioridad. El test de caché usa un WAV
sintético Piper identificado como fixture; no es evidencia de una llamada Gemini.
`POST /transcribe` acepta WAV mono PCM16 de hasta 15 s, lo procesa con Vosk en
memoria y no lo escribe. La web convierte el audio grabado a 16 kHz con
OfflineAudioContext. Micrófono requiere consentimiento y un dispositivo real.

## Revisión técnica y visual

Se aplicaron `frontend-production-shadcn` y `visual-review-loop`, conservando
estructura y estilos. Riesgos revisados: no confundir ficha local con IA activa,
no ofrecer guardado/QR offline, no afirmar que el micrófono se queda local cuando
opera online, conservar cancelación y evitar que una respuesta tardía siga hablando.

**Revisión visual pendiente por permisos.** Se intentó levantar el servidor
sintético (`node scripts/e2e-server.ts`) y después iniciar Next directamente con
`startServer`; ambos fallaron con `Error: spawn EPERM`. El segundo llegó a anunciar
Next.js 16.4.5 y luego terminó. No se obtuvo una página actual para recorrer ni
capturas de la implementación. No se han completado las dos pasadas reales,
ni escritorio ni móvil, y los tests no se presentan como revisión visual.

Pendiente en un entorno con subprocess habilitado: ejecutar el servidor sintético
con clave AI vacía y origen 3002; túnel SSH de voz; recorrer consentimiento online,
respaldo de TTS fallido, fichas offline, permiso de micrófono denegado,
interrupción/silencio, error de voz local y retorno de red. Primera inspección y
correcciones, después recarga y segunda inspección a 1440 y 390 px, también
320 y 768 px. Guardar capturas legibles y hallazgos por pasada.

## Límites de operación

Este respaldo funciona en una página de kiosco ya cargada. **No añade un service
worker ni instala Chromium o la web completa en la Pi**. Arrancar el kiosco desde
cero o recargar Vercel sin red requiere otro trabajo para servir/cachear el shell.
No se verificaron navegador real de la Pi, altavoz/jack, micrófono USB, PNA ni
HTTPS→loopback en ese equipo. En producción, confirmar permiso de acceso a red
local del navegador para el origen exacto; no desactivar globalmente la seguridad.
El respaldo offline es español, aunque la interfaz online admite inglés.

Fuentes de instalación: [Piper, API oficial](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md),
[voz oficial es_MX](https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_MX/ald/medium),
[modelos oficiales Vosk](https://alphacephei.com/vosk/models).
Piper instalado declara GPL-3.0-or-later; conservar licencia y MODEL_CARD de la
voz antes de redistribuir. El paquete permanece en la Pi, fuera del repositorio.
