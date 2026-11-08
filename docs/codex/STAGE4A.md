# Codex — Etapa 4A: correcciones de revisión + Ary con Gemini (chat fundamentado) + robot simulado

Sigues en `D:\Ary The Parrot`. Las etapas 1–3 están hechas, verificadas por el revisor y commiteadas (80 E2E en verde). Lee primero:

- `docs/FEATURE_MATRIX.md`
- `docs/ARY_STAGE3_REPORT.md`, incluida la nota del revisor al principio
- `README.md`

Documento rector: `docs/ARY_PROMPT_MAESTRO.md`. En esta etapa aplican sobre todo las secciones 0D, 2 (Flujo A, punto 3), 5 (`/api/chat` y `/api/robot/events`), 6, 10, 12 y 13 (puntos 10 y 12).

## Restricciones

- No toques `legacy/`, `public/brochure.html`, `public/assets/` ni `public/index.html`. La regresión de la landing debe seguir en 0 píxeles distintos en reposo.
- No hagas commits ni push. No envíes correos reales.
- Ignora memorias de otros proyectos. **En este proyecto Gemini SÍ es el proveedor de IA elegido por el usuario**, con la clave en `.env.local` como `GEMINI_API_KEY`.
  - **Nunca imprimas, registres ni copies su valor.**
  - Nunca la expongas al cliente ni en `NEXT_PUBLIC_*`.
- Tu sandbox no lanza Chromium ni `next dev`; el revisor ejecuta los E2E. Lecciones de revisiones anteriores:
  - `getByRole("alert")` choca con el anunciador de Next; usa `.filter`.
  - Instala `page.clock` antes de cargar la página.
  - Espera a que termine la acción asíncrona antes de adelantar el reloj.
  - Un salto de reloj puede saltarse estados.
  - En un servidor dev en frío, el primer clic puede llegar antes de la hidratación: usa `expect(...).toPass()` en las acciones de entrada.
- No metas rodeos de sandbox en la configuración.

## 1. Correcciones de la revisión (P0, primero)

1. **Envío inmediato de correos transaccionales.**
   - Hoy `recovery`, `commercial_receipt`, `commercial_admin` y `marketing_confirmation` solo se encolan y dependen del cron, que en Vercel Hobby es diario.
   - Tras confirmar la transacción, despacha **esas filas concretas** en la misma petición: `after()` de `next/server` si es fiable en esta versión (consulta `node_modules/next/dist/docs/`), o un `await` acotado con timeout.
   - Mantén la idempotencia (`idempotencyKey` y bloqueo de fila) para que el cron no las reenvíe.
   - El cron diario queda para reintentos, recordatorios y marketing.
   - Tests: tras `request-link`, la fila queda `dry_run` o `accepted_by_provider` sin ejecutar el cron, y no hay doble envío si el cron corre después.
2. **Consentimiento del formulario B2B sin `window.confirm`.**
   - Sustitúyelo por un paso integrado en `#request-result`, visible solo **después** de «Preparar solicitud» (en reposo no cambia ningún píxel).
   - El paso tiene una casilla «Autorizo tratar estos datos para responder a mi solicitud (Aviso 2026-11-07.v1)» con enlace a `/privacidad`, un botón «Enviar solicitud» y el botón TXT siempre disponible.
   - Sin la casilla no se envía nada.
   - Accesible: foco, `role="status"` en el resultado y textos claros.
   - Actualiza el test de la landing que hoy descarta el diálogo nativo y los E2E de la etapa 3.
3. **El kiosco marca «Sin conexión» durante 15 s si la primera comprobación de salud falla**, por ejemplo con el servidor en frío.
   - Reintenta con backoff corto (1 s, 2 s, 4 s… hasta 15 s) mientras esté offline.
   - Distingue «Comprobando conexión…» de «Sin conexión». No marques «Modo demostración sin dispositivo» hasta que `/api/kiosk/me` haya respondido.

## 2. Ary conversa: pipeline fundamentado con Gemini

`src/server/ai/` contiene:

- La interfaz `AiProvider`.
- `GeminiProvider`, que usa la API REST oficial con `fetch` y la cabecera `x-goog-api-key` (la clave nunca va en la URL). Consulta la documentación actual de Gemini.
- `DemoAiProvider`: determinista, responde con texto de las fichas y va rotulado.

Modelo:

- Lo fija `AI_MODEL`. Para elegir el valor por defecto, lista los modelos disponibles con la clave y escoge un modelo «flash» estable y actual (no preview si hay alternativa). Documéntalo.
- Si falta la clave o el modelo falla, se usa el modo demo. **La UI muestra siempre el modo real: «IA en línea · Gemini» o «Respuestas de ejemplo».**

`POST /api/chat`, con sesión de visitante y CSRF:

1. Valida el mensaje: longitud ≤ 500 y límite de mensajes por sesión.
2. Clasifica la intención. Los **temas sensibles** (vuelos, puertas, migración, aduanas, seguridad, emergencias, salud, leyes) **no van al modelo**: se responde con una plantilla que deriva al personal del aeropuerto o al sitio oficial, sin inventar.
3. Recupera fichas publicadas relevantes de la BD, en el idioma y por intereses.
4. Llama a Gemini con:
   - Un system prompt que fija la personalidad de Ary (cálida, breve, dominicana, sin estereotipos por nacionalidad, sin inventar horarios, precios ni requisitos).
   - Las fichas como **contexto delimitado y no confiable**.
   - **Salida estructurada JSON** (`responseMimeType: application/json` + `responseSchema`): `{ answer, citedItemIds[], followUps[], confidence }`.
5. Valida la salida con Zod:
   - `citedItemIds` debe ser un subconjunto de las fichas entregadas.
   - Si no cita ninguna ficha y afirma hechos, cae al modo demo o a la frase «No tengo una fuente verificada para eso».
   - Renderiza como texto plano (sin HTML) y muestra las fuentes enlazadas de las fichas citadas.
6. Defensa contra prompt injection: el contenido de las fichas y el del usuario van separados, y se ignoran instrucciones dentro de ellos. Test con una ficha o mensaje maliciosos («ignora las instrucciones…»).
7. Controles de coste:
   - `maxOutputTokens` bajo y timeout de 12 s.
   - Rate limit por sesión y global por minuto con la tabla `rate_limits`.
   - Se registran `model`, tokens de entrada y salida, latencia y error saneado en una tabla `ai_usage` (migración nueva), **sin el texto de la conversación**.
8. Historial: `chat_messages` solo durante la sesión, con `retentionUntil` igual al fin de la sesión. Persistirlo más allá requiere un consentimiento explícito; si no se implementa, documéntalo como pendiente. `db:cleanup` lo limpia.

UI:

- **Kiosco:** tras las recomendaciones, «Pregúntale a Ary» con 3 preguntas sugeridas y un campo de texto con teclado en pantalla nativo. Las respuestas son breves y van con su fuente.
- **`/experiencia` (móvil):** chat continuable con el mismo modo rotulado.
- Estados claros: cargando, error y límite alcanzado.
- La voz (TTS y micro) **no** entra en esta etapa. Déjala documentada como siguiente paso, con permisos explícitos.

Verificación real:

- Si `GEMINI_API_KEY` existe, haz **como máximo 3 llamadas reales cortas** para comprobar la integración. Registra en el informe solo el modelo, la latencia y que la salida validó; nunca la clave.
- Los tests unitarios mockean `fetch`. Nunca llaman a la red.
- Añade un E2E que fuerce el modo demo (sin clave) y verifique el rótulo «Respuestas de ejemplo» y la derivación de temas sensibles.

## 3. Robot: adaptador y simulador honesto (sección 10)

- `RobotAdapter` con `MockRobotAdapter`, rotulado «Simulador», y un `HardwareRobotAdapter` documentado: interfaz y protocolo, sin fingir.
- Estados: `idle`, `welcome`, `listening`, `thinking`, `speaking`, `handoff_qr`, `offline`, `error`, `maintenance`. El kiosco los emite según su estado **real**: `thinking` mientras espera a `/api/chat` y `speaking` mientras muestra la respuesta. Nada de `setTimeout` que finja movimiento.
- `POST /api/robot/events`:
  - Autenticación del dispositivo por HMAC con `ROBOT_DEVICE_AUTH_SECRET`, más el id del dispositivo, un timestamp de ±60 s y un nonce de un solo uso (tabla o `rate_limits`) contra replays.
  - Validación con Zod y deduplicación por `eventId`.
  - Sin secreto configurado: 503.
  - **Nunca** acepta comandos de motor desde la web pública.
- `GET /api/robot/commands`: polling saliente desde la Pi, con la misma autenticación, que devuelve la siguiente animación permitida (allowlist de gestos por estado). Así no hace falta abrir puertos en la Pi.
- `pi/`: servicio de referencia en Python (stdlib + `pyserial` opcional) que:
  - hace polling HTTPS saliente;
  - firma con HMAC;
  - tiene un modo `--simulate`, que imprime los gestos en lugar de mover servos;
  - mantiene una cola local de eventos offline;
  - deja documentado el protocolo serie hacia Arduino/ESP32 (mensajes cortos `GESTURE <name>\n` con ACK), con límites de seguridad: timeout, parada y sin movimiento sin ACK.

  Incluye tests de Python con `unittest` para la firma y la cola.
- Muestra el estado del robot en el kiosco: «Simulador · gesto: saludar». Nunca «robot conectado» sin eventos reales autenticados recientes.

## Tests

- **Vitest:**
  - envío inmediato y no duplicado;
  - consentimiento B2B requerido;
  - pipeline de IA con fetch mockeado: salida válida, salida inválida → fallback, cita fuera de contexto → rechazo, prompt injection, tema sensible → derivación sin llamar al modelo, rate limit, sin clave → demo, uso registrado sin texto;
  - robot: firma válida o inválida, timestamp viejo, nonce repetido, deduplicación, sin secreto → 503.
- **Python:** `python -m unittest` en `pi/`.
- **Playwright:**
  - Kiosco: preguntar a Ary en modo demo, ver la respuesta con fuente y el rótulo, y que un tema sensible se derive.
  - Formulario B2B con el paso de consentimiento integrado.
  - Kiosco en frío: «Comprobando…» y luego disponible.

## Docs

- `docs/ARY_AI.md`: pipeline, modelo elegido y por qué, guardrails, costes, privacidad y límites.
- `docs/DEPLOY_VERCEL_AND_PI.md`: completo y reproducible. Incluye:
  - Variables en Vercel.
  - Raspberry Pi OS: Chromium en modo kiosco al arrancar (autostart/systemd), apagado de pantalla y cursor, rotación.
  - El servicio `pi/` con systemd.
  - Activación del kiosco y healthcheck.
- Actualiza `FEATURE_MATRIX.md`, `ARY_IMPLEMENTATION_PLAN.md`, `.env.example` (`AI_MODEL`, `ROBOT_DEVICE_AUTH_SECRET`, etc., como placeholders) y el README.

## Criterio de terminado

- `lint`, `typecheck`, `test` y `build` pasan, o queda documentado el error exacto del sandbox.
- Pasan los tests de Python.
- Los E2E quedan escritos.
- Al terminar, imprime: archivos, migraciones, variables, llamadas reales a Gemini (modelo, latencia, validación; sin la clave), comandos con su resultado y bloqueos.
