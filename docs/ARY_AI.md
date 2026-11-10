# IA cultural de Ary

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
