# IA cultural de Ary

## Etapa 6 · contrato actual de voz (10 de noviembre de 2026)

Esta sección sustituye las descripciones de interfaz y permisos de 4A que siguen como historial. Se retoma el árbol de trabajo existente, sin commits, despliegues, correos ni nuevas llamadas al proveedor.

### Entrada, respuesta y seguridad

`POST /api/voice/ask` exige sesión vigente, Origin/Host y `X-Ary-Request: 1`. Lee el cuerpo binario por streaming con máximo **1 MiB**, comprueba MIME y cabecera de contenedor (WebM/Opus como camino principal; Ogg, MP4 y WAV admitidos por la API). Exige duración declarada entre 100 y 15 000 ms. El cliente corta MediaRecorder a los 15 s y libera las pistas al terminar, cancelar, pasar al teclado, cerrar o quedar offline. La duración enviada es metadato del cliente, no una medición del servidor de cada contenedor. No hay Web Speech API ni File API de Google.

Una sola petición `generateContent` incluye audio inline en memoria y devuelve transcripción/respuesta. Reutiliza `chat()`, contenido publicado con HTTPS, defensa ante instrucciones, historial cultural acotado, 20 preguntas por sesión y límites por minuto. Para audio se envían hasta doce fichas de 1000 caracteres porque todavía no hay palabras para la recuperación; en texto, seis de 1800. No se envía el país. El proveedor admite WebM como [entrada de audio](https://ai.google.dev/gemini-api/docs/audio).

Zod exige `displayText` (1–600), `spokenText` (1–700), `citedItemIds`, `followUps`, `confidence`, `intent` y, en audio, `transcript` (1–500). Se mantiene `answer` como alias compatible de `displayText` en la respuesta pública. Las citas deben estar en el contexto; la respuesta cultural requiere cita y confianza suficiente. Silencio/salida inválida sin transcripción fiable devuelve `voice_unavailable`, sin inventar palabras. Si hay transcripción validada pero la respuesta falla su fundamentación, se permite una ficha de ejemplo, rotulada como tal. Timeout de generación: 12 s; salida máxima: 900 tokens; sin reintentos de IA.

Los temas sensibles escritos se derivan antes del proveedor. En voz deben enviarse a Google para transcribirlos y se reclasifican después en el servidor; esto se informa en Privacidad. Las derivaciones tienen prioridad sobre frases de saludo/país. Los campos de preferencias se extraen de declaraciones explícitas, y el cliente sigue guardándolos por `/api/visitor/preferences`; inglés/español, intereses y rechazo a declarar país conservan su contrato. Ninguna respuesta autoriza herramientas o acciones.

### Voz, formato y reproducción

`POST /api/voice/speak` solo acepta `{ messageId }` UUID estricto. Busca un mensaje assistant propio, cifrado, vigente y validado: rechaza texto libre, mensajes ajenos y sesiones cerradas. Devuelve `audio/wav`, `no-store`. Sesión/CSRF como el chat; límites predeterminados de **8/min por sesión** y **30/min globales**, también sobre aciertos de caché. Timeout TTS: 10 s; `maxDuration=30` en ambas rutas. El cliente limita ask/speak a 18/12 s.

`AI_TTS_MODEL=gemini-3.8-flash-lite-tts` y `AI_TTS_VOICE=Sulafat`, con la misma clave privada `GEMINI_API_KEY`. Google describe Sulafat como femenina y cálida en su [lista oficial de voces](https://firebase.google.com/docs/ai-logic/generate-speech#voice-names). Es una elección provisional por ese tono; la preferencia subjetiva y el acento requieren escucha del propietario.

REST: `models/{model}:generateContent`, `responseModalities: ["AUDIO"]` y `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`. **En 3.8 el texto es literal**: el estilo cálido, expresivo, de cotorra y con acento caribeño suave va en `contents[].parts[].speechMetadata.style`, separado del texto. Las instrucciones de producción ya no se incluyen en el transcript. La alternativa 2.5 configurable conserva su prompt de estilo. Fuentes: [TTS actual](https://ai.google.dev/gemini-api/docs/speech-generation) y [Part/SpeechMetadata y SpeechConfig REST](https://ai.google.dev/api/generate-content).

El lector admite PCM mono de 16 bits/24 kHz, que envuelve en WAV, y WAV ya formado, que valida sin envolver dos veces. Las respuestas reales heredadas fueron `audio/wav`; no se presupone PCM sin cabecera. La caché en memoria usa SHA-256 de texto/voz/modelo, vence en cinco minutos y tiene máximo 12 MiB. Solo conserva voz de Ary; no grabaciones del visitante. Se comprueba la sesión incluso al devolver caché y tras esperar al proveedor.

Un único `<audio>` reproduce las respuestas. `play`/`ended`/`pause` gobiernan `speaking` de ilustración y robot; no hay temporizador de conversación fingida. Micrófono/teclado interrumpen la voz; teclado cancela y libera la grabación. Silenciar no pierde una grabación ni una transcripción en curso. Ante rechazo de autoplay, fallo de red, decodificación o timeout, el texto sigue disponible y aparece «Ahora no puedo hablar, te lo escribo». Sin interacción no se intenta hablar al restaurar una sesión móvil. Sin internet no se solicita TTS; no se añadió audio offline.

El servidor elimina trinos y repeticiones de la propuesta de voz y comprueba que contenga la misma información que el subtítulo. Solo el saludo añade un trino controlado; como máximo un manerismo hablado y ninguno en derivaciones sensibles, privacidad o vuelos.

### Evidencia real heredada y latencia

Se consumieron **4/4 peticiones reales** en las ejecuciones anteriores: 1 en `live-voice-attempt-1.json` y 3 en `live-voice.json`. Esta reanudación hizo **cero**. Registro: [call-ledger.json](evidence/stage6/call-ledger.json). El script verifica el presupuesto acumulado antes de cargar credenciales y no permite repetir el recorrido de tres peticiones con este cupo agotado. Tests usan exclusivamente fetch/rutas mockeadas.

| Medida heredada | Resultado |
| --- | --- |
| Primer TTS | Formato inicialmente rechazado: `invalid_tts_audio` |
| Muestra Sulafat | 4677 ms, WAV válido |
| Audio → respuesta | 4158 ms, **sin respuesta Gemini validada**; no se registró código explicativo |
| TTS de la respuesta resultante | 7578 ms, WAV válido |
| Pregunta → WAV | 11 736 ms; excluye captura, subida y reproducción |

Los WAV sintéticos se preservan como evidencia histórica, no como audio de producción. Las mediciones preceden a la corrección de `speechMetadata` y no prueban la voz final, la transcripción real correcta ni la latencia de un usuario/Pi. No se puede atribuir una causa exacta al fallo sin evidencia adicional. No hubo nueva prueba real porque no queda cupo.

Se mantiene el flujo completo validar → TTS, con texto inmediato y degradación honesta. No se sintetizan frases sin validar ni se añaden más peticiones para segmentar audio. Si la latencia medida en dispositivo sigue siendo excesiva, evaluar primero caché de saludos y luego streaming/Live con autorización y presupuesto propios.

### Plan posterior para Gemini Live (sin implementar)

Mantener el teclado y las rutas actuales como respaldo. Añadir una ruta de servidor que autentique la sesión, aplique CSRF/límites y emita un token efímero de alcance/vida mínimos; nunca entregar la API key al navegador. Abrir un WebSocket Live solo tras gesto y explicación de privacidad, con indicador de escucha, interrupción, duración acotada y cierre al acabar/offline. Conservar validación de citas, derivaciones sensibles, contratos de guardados/QR y métricas sin contenido; acordar cómo validar la salida antes de hablar. Revisar procesamiento/retención del proveedor y menores, y medir latencia/pérdida de red en Chromium/Pi antes de decidir la migración. Referencia: [Live API](https://ai.google.dev/gemini-api/docs/live).

## Historial de etapa 4A

## Pipeline implementado

`POST /api/chat` requiere sesión `ary_sid`, origen válido y `X-Ary-Request`. Zod limita la pregunta a 500 caracteres. Hay un máximo de 20 preguntas por sesión, seis/minuto por sesión y 30/minuto globales por defecto, almacenados mediante UPSERT en `rate_limits`. Las variables permiten ajustar los dos límites por minuto hasta 20 y 120 respectivamente.

La clasificación determinista deriva vuelos, puertas, migración, aduanas, seguridad, emergencias, salud y leyes al personal o autoridad oficial. Horarios, precios y requisitos sin fuente producen incertidumbre. Esos mensajes nunca se envían al modelo, tampoco como historial posterior. La clasificación cubre vocabulario ES/EN con normalización de acentos. No es un clasificador semántico universal.

La recuperación selecciona hasta seis fichas publicadas del idioma de sesión, con URL HTTPS. Puntúa coincidencias de palabras e intereses declarados, con desempate por clave. El país no se envía al modelo ni determina gustos. Los textos curatoriales se acotan y se filtran patrones de instrucciones maliciosas. El contexto, el historial cultural de hasta cuatro mensajes y la pregunta ocupan partes separadas, escapadas como JSON y delimitadas como datos no confiables.

`AiProvider` tiene dos implementaciones. `GeminiProvider` hace una única petición REST con `x-goog-api-key`, timeout de 12 s, 768 tokens máximos de salida y JSON estructurado mediante `responseMimeType` y `responseSchema`. `DemoAiProvider` devuelve texto determinista de una ficha y sus fuentes. El system prompt define una Ary cálida, breve y dominicana, con reglas de fuentes, incertidumbre y respeto cultural. No hay herramientas ejecutables ni navegación del modelo. El contrato REST y las salidas estructuradas se contrastaron con documentación oficial. [API generateContent](https://ai.google.dev/api/generate-content), [salidas estructuradas](https://ai.google.dev/gemini-api/docs/structured-output).

Zod valida `{ answer, citedItemIds, followUps, confidence }`, longitud y cardinalidad. Las citas deben pertenecer al contexto. Ausencia de cita, confianza menor de 0,6, HTML/URLs, importes con símbolo u horas numéricas, salida incompleta, JSON inválido y fallos del proveedor activan el modo de ejemplo. El navegador renderiza texto plano y solo enlaza URLs de las fichas del servidor. Un ID citado no demuestra por sí solo que cada afirmación sea correcta. La revisión editorial y la evaluación semántica con casos reales siguen pendientes.

## Modelo predeterminado

El valor final es `gemini-3.5-flash-lite`, sustituible mediante `AI_MODEL`. La consulta autenticada de modelos confirmó su disponibilidad y soporte `generateContent`. La ficha oficial lo identifica como estable, actualizado en septiembre de 2026. Se eligió después de contrastar esa ficha, al ser más reciente que la referencia inicial 3.6. No se eligió un alias móvil ni una preview. [Modelos disponibles](https://ai.google.dev/api/models), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

El rótulo se asigna a cada respuesta efectiva. Una generación validada muestra «IA en línea · Gemini». Una plantilla o fallback muestra «Respuestas de ejemplo». La disponibilidad de una clave no acredita que el proveedor esté funcionando. Health informa `configured_unverified` y no llama a la API de IA.

## Comprobación real de esta ejecución

Se hicieron tres peticiones autenticadas en total, una consulta de modelos y dos generaciones breves. Los fallos de preparación del script anteriores a `fetch` no generaron tráfico. Se agotó el máximo autorizado y no se hicieron más peticiones al cambiar la referencia final a 3.8.

| Modelo comprobado | Latencia del pipeline | Salida Gemini validada | Resultado |
| --- | --- | --- | --- |
| `gemini-3.6-flash` | 1724 ms | No | `provider_http_error`, primera clasificación genérica |
| `gemini-3.6-flash` | 1880 ms | No | HTTP 503, `UNAVAILABLE`, `provider_http_503` |

En ambos casos el pipeline devolvió una respuesta de ejemplo. La integración real y el modelo final 3.8 requieren una verificación posterior autorizada. Solo se guardaron modelo, latencia, validación y código saneado en `evidence/stage4a/live-ai*.json`. La clave nunca se imprimió, copió ni guardó en evidencia.

`node scripts/verify-ai.ts --live` realiza una sola generación sobre una BD temporal en memoria con contenido público del seed. Requiere autorización del operador y disponibilidad dentro de su presupuesto de llamadas. Las unitarias mockean `fetch` y los E2E fijan `GEMINI_API_KEY` vacío.

## Coste, privacidad y retención

Se limita el tamaño de entrada, contexto, historial, salida, tiempo, llamadas por sesión y carga global. No hay reintentos automáticos de generación. `ai_usage` registra modelo, tokens de entrada/salida declarados por el proveedor, latencia, modo y código saneado. No guarda pregunta, respuesta, cuenta, IP ni identificador de sesión. En fallos anteriores a recibir metadata los contadores son cero y no representan una medición de facturación. Consultar precios vigentes y métricas de la cuenta antes de operar. [Precios oficiales](https://ai.google.dev/gemini-api/docs/pricing).

`chat_messages` cifra los textos mediante AES-GCM y usa `retentionUntil = visitor_sessions.expiresAt`. GET solo devuelve el historial de la sesión vigente. El cierre, el canje QR y la recuperación de cuenta eliminan el chat de la sesión anterior. Una respuesta tardía no puede recrearlo. `db:cleanup` purga chats caducados y uso técnico de más de 30 días. La continuidad del chat se limita a la sesión actual del móvil, con restauración al recargar. El QR continúa selecciones y guardados según su contrato vigente. Transferir o conservar el historial más allá de una sesión queda pendiente de consentimiento explícito específico.

Al preguntar en línea, Google procesa la pregunta cultural y el contexto acotado. La interfaz y privacidad lo informan. Condiciones del proveedor, retención externa, responsable, menores y transferencias internacionales necesitan revisión antes de producción. Los plazos de limpieza son propuestas operativas.

## Siguiente etapa

TTS y micrófono requieren activación visible, permisos específicos, indicación del uso real y reglas de conservación antes de implementarse. `speaking` en esta etapa significa respuesta de texto visible. No acredita audio, movimiento físico ni un modelo entrenado por el equipo.

## Modelo en producción (2026-11-10)

Primera prueba en `arytheparrot.app`: `gemini-3.8-flash` agotó el timeout de 12 s y Ary pasó a «Respuestas de ejemplo», como está diseñado. Mediciones directas ese día:

| Modelo | Resultado |
| --- | --- |
| `gemini-3.8-flash` | 503 tras 171 s |
| `gemini-3.7-flash` | 503 |
| `gemini-3.1-flash-lite` | 503 |
| `gemini-3.5-flash-lite` | 200 en 6–7,5 s, dos de dos |

El predeterminado pasa a `gemini-3.5-flash-lite`. Si Google se estabiliza, se puede volver a un modelo mayor cambiando solo `AI_MODEL`.
