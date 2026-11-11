# Ary — Etapa 9C: fiabilidad del chat e imágenes

Fecha: 2026-11-11. Cambios exclusivamente locales en `D:\Ary The Parrot`.

Implementación y comprobaciones unitarias terminadas. `lint`, `typecheck` y 278 pruebas pasan. El build compila con Turbopack pero falla al lanzar su paso TypeScript por `spawn EPERM`; Playwright y las dos pasadas visuales quedan pendientes por las limitaciones de ejecución descritas abajo. No se declara validación de producción, latencia real ni aceptación visual.

## Archivos

Modificados:

- `.env.example`: variables opcionales de tiempo y pensamiento.
- `package.json`: comando `ai:report`.
- `playwright.config.ts`: proyecto `stage9c`.
- `scripts/e2e-server.ts`: opción de proveedor fallido completamente simulado para el proceso de pruebas.
- `src/db/seed.ts`: alias de búsqueda ES/EN en las doce fichas.
- `src/i18n/language.ts`: detección local de las peticiones de imágenes en ES/EN.
- `src/server/ai/chat.ts`: recuperación pertinente, respaldo, fotos, contexto reducido y manejo de transcripciones en fallos.
- `src/server/ai/providers.ts`: respaldo fundamentado, rescate de citas, validaciones, límites y configuración del proveedor.
- `src/server/ai/safety.ts`: clasificación `images`, detrás de las prioridades de seguridad.
- `tests/unit/stage4a.test.ts`: expectativa actualizada de citas ajenas al contexto; baja confianza ya no es un rechazo independiente.
- `tests/unit/stage6.test.ts`: límite de ocho fichas de voz y aserción del system abreviado.

Nuevos:

- `src/server/ai/retrieval.ts`: coincidencias por tokens completos, palabras vacías y variantes básicas singular/plural.
- `scripts/ai-usage-report.ts`: diagnóstico de solo lectura.
- `scripts/e2e-ai-failure.ts`: preload exclusivo del servidor de pruebas que devuelve HTTP 500 para el host de IA, sin contactar ese host.
- `tests/unit/stage9c.test.ts`: 45 casos nuevos.
- `tests/e2e/stage9c.spec.ts`: seis casos, incluidos dos recorridos de captura separados.
- `docs/ARY_STAGE9C_REPORT.md`: este informe.
- `docs/evidence/stage9c/visual-review.md`: evidencia de los bloqueos y comprobaciones visuales pendientes.
- `docs/screenshots/stage9c/README.md`: identificación de las capturas previstas; no se generaron capturas.

El archivo de instrucciones `docs/codex/STAGE9C_CHAT_RELIABILITY.md` ya estaba sin seguimiento al comenzar; se leyó y no se modificó. No se modificaron componentes del carrusel, estilos ni disposición de la interfaz.

En el estado final aparecieron cambios simultáneos ajenos a esta etapa en estilos, páginas estáticas, `shared.tsx`, plantillas de correo, assets de marca, `data/` y la guía de etapa 10A. Se conservaron sin editarlos ni atribuirlos a esta entrega. Los resultados de comandos corresponden a las ejecuciones indicadas, no constituyen una auditoría de ese trabajo paralelo.

## Migración y seed

No hay migración. Se reutiliza `tags: string[]`, incluyendo los intereses originales y los alias. Los visitantes no ven estos alias como texto de la ficha. El seed mantiene sus upserts e IDs y aplica los mismos alias a ambas versiones de idioma. Los filtros de recomendación siguen comparando los intereses conocidos.

El seed y las migraciones existentes se probaron solamente en PGlite en memoria con fuentes sintéticas, sin HTTP de comprobación de fuentes. La actualización del seed sobre datos existentes queda para el revisor en el entorno que autorice; no se ejecutó en producción. No se añadió `0006` porque no cambia el esquema.

## Alias añadidos

| Ficha | Alias de búsqueda ES/EN |
| --- | --- |
| ciudad-colonial | zona colonial, colonial zone, santo domingo colonial, casco historico, historic district, catedral primada, first cathedral |
| haitises | cuevas, caves, manglares, mangroves, petroglifos, petroglyphs |
| ballenas | ballenas, whales, samana, avistamiento, whale watching |
| mangu | comida, desayuno, food, breakfast, platano, plantain |
| merengue | musica, baile, music, dance |
| bachata | musica, baile, music, dance |
| larimar | piedras, joyas, gems, jewelry, souvenir |
| ambar | piedras, joyas, gems, jewelry, souvenir, amber |
| carnaval | diablos cojuelos, mascaras, masks, carnival |
| altos-chavon | la romana, anfiteatro, amphitheatre, amphitheater |
| cocolo | san pedro de macoris, cocolo dance drama |
| congos | villa mella, congos brotherhood |

La búsqueda normaliza acentos y compara tokens completos, con variantes básicas de plurales `s/es`. Ignora términos de petición, imágenes, país y otras palabras vacías. Los intereses solo ordenan fichas que ya tienen coincidencia real en texto. Así, cuevas/cueva y caves/cave recuperan Haitises; whales/whale recuperan ballenas. Una pregunta clasificada inicialmente como general se fundamenta cuando coincide con una ficha, incluido por alias.

Al reducir voz a ocho fichas, las que empatan en relevancia/intereses priorizan Merengue, Bachata, Mangú, Ciudad Colonial, Haitises, Ballenas, Carnaval y Altos de Chavón. Si se rechaza una respuesta de voz pero se conserva la transcripción, se repite la búsqueda por esa transcripción en el idioma detectado: el respaldo no usa el primer registro del contexto amplio de audio.

## Respaldo, rescate y seguridad

- Ante timeout, red, HTTP 500, JSON inválido, respuesta incompleta o rechazo, las coincidencias recuperadas producen un texto cálido con el título y resumen de la ficha principal. Se citan solo coincidencias, como máximo tres, con `intent: culture`. La voz dice ese mismo texto.
- Sin coincidencias se ofrecen temas culturales con follow-ups, sin ficha por defecto ni la frase «no puedo pensar bien». Audio sin transcripción conserva el error recuperable `voice_unavailable`, sin inventar texto ni historial.
- Los IDs desconocidos se filtran antes de validar UUIDs de la respuesta final, incluidos strings que no son UUIDs. Las citas conocidas con confianza menor de 0.6 se aceptan.
- Si falta una cita cultural, se intenta el rescate por título exacto del contexto; si no funciona, se activa el respaldo fundamentado y se registra `ungrounded_output`.
- Las respuestas generales permiten años como 2016 y «siglo XVI». Precios/monedas, horas, distancias, URLs, HTML y coordenadas siguen rechazándose. Los controles se aplican también al texto hablado y follow-ups.
- Temas sensibles, inyección y datos sin verificar conservan prioridad. Las fichas recuperadas deben estar publicadas, tener fuente HTTPS comprobada y no contener inyección, también en sus tags.
- `ai_usage` conserva el modelo intentado, modo resultante, tokens y `errorCode` del fallo; una cita desconocida rescatada correctamente no registra un fallo inexistente. No se añaden mensajes ni datos personales a las métricas.

## Peticiones de fotos

`images` es una intención interna de clasificación. La respuesta mantiene `intent: culture` para reutilizar el carrusel de la etapa 9.

1. Un tema explícito usa sus coincidencias con foto verificada.
2. Sin tema, usa las fichas con foto del último turno citado que las tenga.
3. Sin contexto, usa Ciudad Colonial, Haitises y Altos de Chavón, siempre que sigan publicadas y tengan media válida.

Un tema desconocido o una ficha sin fotografía no heredan una imagen ajena: se ofrece elegir otro tema. La respuesta visible nombra las fotos; la voz dice «Te dejé las fotos en pantalla» o «I've put the photos on screen». La frase hablada se conserva al persistir y recargar el historial. La ruta de fotos en texto no invoca al proveedor; la voz reutiliza su transcripción existente y resuelve las fotos de forma determinista.

El system informa de que la app muestra las fotos y mapas verificados de los registros citados y prohíbe afirmar que no puede mostrar imágenes. El kiosco reutiliza la supresión existente de Maps y enlaces externos, conservando las fotos. Vitest comprueba su markup; el recorrido interactivo del kiosco sigue pendiente.

## Variables y velocidad

| Variable | Comportamiento |
| --- | --- |
| `AI_TIMEOUT_MS` | Opcional. Ausente, vacío o inválido: 9000 ms en texto y 12000 ms en voz. Un valor positivo sobrescribe ambos; máximo 60000 ms. Al abortar se usa el respaldo local. |
| `AI_THINKING_LEVEL` | `low` por defecto; admite `minimal`, `low`, `medium`, `high`. Usar `minimal` solo si el modelo elegido lo admite. No se hizo una llamada real para comprobar compatibilidad. |
| `AI_MODEL` | Conserva la selección configurable y la validación del nombre; default `gemini-3.5-flash-lite`. |

El contexto enviado contiene como máximo cuatro fichas en texto y ocho en voz, con `validatedDescription` de hasta 600 caracteres. Se envían los últimos cuatro mensajes permitidos del historial, de hasta 300 caracteres cada uno. El system se acorta manteniendo reglas, detección de idioma y delimitadores de datos no confiables. `maxOutputTokens` baja a 500. No se implementa un reintento remoto que duplique el tiempo de espera.

### Medición por modelo

`npm run ai:report -- --limit 100` imprime las últimas N filas: fecha, modelo, modo, errorCode, latencyMs y tokens de entrada/salida. Después imprime porcentaje total de errores y por código sobre esas N filas, y tamaño de muestra, media y p90 por modelo. El p90 usa el rango más próximo `ceil(0.9*n)`. Los grupos incluyen éxitos y fallos; los modelos `template` y `demo` quedan separados de los modelos remotos.

Para comparar modelos en una prueba futura autorizada, mantener consultas, modalidad, historial y fichas equivalentes, cambiar `AI_MODEL`, y comparar `ai_usage.latencyMs`, errores, tokens y tamaño de muestra para cada modelo. No concluir que un modelo es mejor por una media con pocas filas o porque falle antes. `latencyMs` mide la fase de chat hasta registrar uso, incluyendo recuperación y proveedor; no mide reproducción TTS ni todo el recorrido del visitante. La columna `mode` existente indica `gemini`/`demo`, no distingue texto de audio; no se inventa esa segmentación en el informe.

El diagnóstico de una base existente abre una transacción `READ ONLY`, sin migraciones, seed ni limpieza. No imprime la URL de conexión, claves ni errores internos. Para un archivo de entorno explícito se admite `--env-file RUTA`; no se usó esa opción contra credenciales reales. `--memory` no carga archivos de entorno, ignora cualquier URL de conexión heredada y solo prepara un esquema efímero para probar el diagnóstico.

## Comandos y resultados

Entorno disponible: Node 26.2.0; el proyecto prescribe Node 24.x. No se instalaron herramientas ni dependencias.

| Comando / comprobación | Resultado final |
| --- | --- |
| `npm run lint` | PASS, exit 0, cero advertencias |
| `npm run typecheck` | PASS, exit 0 |
| `npm test -- --maxWorkers=2` | PASS, 278 pruebas en 20 archivos; 39.66 s |
| `npm run ai:report -- --memory --limit 5` | PASS, cabecera y `Summary: 0 rows (latest 5)` / `Errors: 0/0 (0.0%)`; sin URL de base ni secretos |
| Preload `node --import ./scripts/e2e-ai-failure.ts` con petición al host interceptado | PASS, `Offline provider fixture status: 500`, resuelto por el wrapper sin red |
| `npx playwright test --list --project=stage9c` | PASS, seis casos descubiertos |
| `npx playwright test --project=stage9c --workers=1`, con `ARY_E2E_AI_FAILURE=1` | EXIT 1, `Error: spawn EPERM` antes de ejecutar casos |
| `npm run build:empty-env` | Ejecuta `npm run build` en copia aislada sin `.env` ni secretos heredados; Turbopack compila en 7.0 s, falla en `Running TypeScript ... spawn EPERM` |
| `git -c core.whitespace=cr-at-eol diff --check` | PASS |
| Inventario CUA del navegador y apps | Sin superficies disponibles; errores de host y pipe nativo |

Durante las primeras pruebas se actualizaron las aserciones obsoletas de baja confianza/contexto de voz y se corrigió una coincidencia accidental de «qué» en preguntas generales. La suite final completa pasa con esos ajustes. Las pruebas de precio/distancia incluyen «5 metros» y «5 kilómetros» además de moneda y hora. El diagnóstico se contrasta también con diez filas sintéticas: media 550.0 ms, p90 900 ms y 20.0% de `invalid_output`, sin modificar las filas.

## Bloqueos y revisión visual

La skill [visual-review-loop](C:/Users/Atlas/.codex/skills/visual-review-loop/SKILL.md) exige «al menos dos pasadas» y «No declares verificación visual completada si falta alguna pasada». No pudieron realizarse por dos bloqueos observados: Playwright falla con `spawn EPERM` y CUA devuelve `The browser access host is unavailable`; tampoco está disponible el pipe nativo. No se observaron capturas de esta etapa y no se declara verificada la interfaz.

El [registro visual](evidence/stage9c/visual-review.md) identifica estados, tamaños y pasos pendientes. Los seis casos de Playwright usan la aplicación y catálogo locales; el fallo remoto se simula mediante un preload del servidor de pruebas. Los recorridos de captura recargan antes de cada pasada. El revisor debe ejecutar los casos y mirar las capturas, corregir lo necesario y repetir la inspección de los estados afectados. El build completo también debe ejecutarse en un entorno que permita los subprocesos normales.

No se hicieron commits, push, despliegues, envíos de correo, llamadas reales a Gemini ni conexiones a la base de producción. No se usó Gemini para implementación, análisis o revisión. Se ignoró `outputs/` y no se usaron memorias de otros proyectos. Todos los archivos de texto escritos en esta etapa se editaron mediante `apply_patch` en UTF-8.
