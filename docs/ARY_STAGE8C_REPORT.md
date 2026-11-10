# Etapa 8C — adaptación de E2E

Fecha de ejecución local 2026-11-10.

## Archivos de esta etapa

| Archivo | Cambio |
|---|---|
| `tests/e2e/helpers.ts` | Selectores del campo de pregunta y título de recuperación, solicitud y confirmación de enlaces, lectura de la bandeja sintética. |
| `tests/e2e/stage8-helpers.ts` | Reutiliza la lectura y confirmación centralizadas. |
| `tests/e2e/voice-helpers.ts` | `askText` usa el campo siempre visible, admite los nombres accesibles ES/EN, espera la recuperación del campo y devuelve la respuesta HTTP. |
| `tests/e2e/stage2.spec.ts` | Comprueba el título actual de recuperación. |
| `tests/e2e/stage3.spec.ts` | Usa los helpers comunes y el título inglés actual. Conserva recuperación entre dispositivos, acceso privado, replay, exportación y borrado. |
| `tests/e2e/stage4a.spec.ts` | Usa directamente el campo visible en la prueba de espera, error y límite recuperable. |
| `tests/e2e/stage4b.spec.ts` | Usa los helpers comunes. Tras confirmar y llegar al chat, abre Mis viajes para continuar las comprobaciones de permisos y compartición. |
| `tests/e2e/stage6.spec.ts` | Refuerza cancelación mediante Enter, tracks finalizados, ausencia de subidas y siguiente pregunta utilizable. Añade el estado cancelado a las dos series de capturas existentes. |
| `tests/e2e/stage8.spec.ts` | Comprueba cinco respuestas HTTP 200, campo vacío con envío deshabilitado y sexta pregunta rechazada con HTTP 403 y `email_verification_required`. |
| `src/components/ary-chat.tsx` | Restaura la cancelación durante la grabación con el botón localizado «Usar teclado». |
| `docs/ARY_STAGE8C_REPORT.md` | Causas, alcance, resultados y comprobaciones pendientes. |

El registro temporal `docs/codex/e2e-stage8-failures.log` se eliminó al terminar, conforme a la instrucción.

## Causas encontradas

### Botón de envío y cuota provisional

`AryChat` deshabilita enviar cuando `message.trim()` está vacío. Una respuesta aceptada limpia el campo. El test esperaba que enviar siguiera habilitado inmediatamente después de esa limpieza. La expectativa era incorrecta.

El gate del servidor permite cinco preguntas provisionales y devuelve `email_verification_required` con HTTP 403 al agotarlas. La prueba comprueba ambos resultados HTTP, el estado vacío y la persistencia de las cinco preguntas después de recargar. El producto conserva su lógica de envío y cuota.

### Recuperación

Las suites conservaban la etiqueta «Correo electrónico», el consentimiento «Solicito conservar Mis viajes», el botón «Solicitar enlace de acceso» y títulos anteriores. El formulario actual usa «Tu correo», «Acepto el aviso de privacidad» y «Enviarme el enlace».

Los helpers comunes comprueban consentimiento requerido inicialmente desmarcado, botón deshabilitado antes de aceptarlo, ausencia de marketing cuando la configuración E2E lo desactiva, título de éxito enfocado y mensaje honesto de modo prueba. Después abren directamente la bandeja local, evitando depender de un enlace retirado de la pantalla de éxito o competir con su redirección a los cuatro segundos.

La confirmación de acceso termina en `/experiencia`. La suite de proveedores navega después explícitamente a `/mi-viaje`, donde realiza sus comprobaciones.

### Campo de texto y cambios de idioma

El campo ya está visible durante el chat. La lógica anterior comprobaba visibilidad instantánea y, si la transición aún no había terminado o la etiqueta estaba en inglés, intentaba pulsar un botón de teclado inexistente en ese estado.

El helper espera el textbox por su nombre accesible ES/EN y usa el botón de envío en el idioma actual. También espera que termine el bloqueo de la petición.

### Fallo real de cancelación

La etapa 8 retiró el control que invocaba `voice.cancel()`. Durante la grabación, el campo está deshabilitado y «Parar grabación» procesa el audio. El test antiguo esperaba «Usar teclado» hasta que el límite de 15 segundos detenía la grabación, intentaba enviarla y aparecía el fallback de error. Pulsar ese fallback solo enfocaba el campo. La cancelación ya se había perdido.

Se restauró una acción «Usar teclado» únicamente durante la grabación, junto al estado del micrófono y con el estilo y traducción existentes. Reutiliza `voice.cancel()` para invalidar las peticiones, descartar el callback de envío y liberar los tracks. `flushSync` permite habilitar el campo antes de enfocarlo.

La regresión exige que el control aparezca en tres segundos, registra datos durante 350 ms, lo activa con Enter, comprueba foco y estado idle, deja procesar eventos pendientes y exige cero subidas. Comprueba además la siguiente pregunta de texto. Las series visuales incluyen grabación, cancelación y reanudación a 360, 390, 1280 y 1920 px.

La búsqueda de textos antiguos en `tests/e2e/` quedó revisada. «Solicitar enlace de acceso» sigue siendo válido en el acceso de personal. «Usar teclado» se mantiene en los casos de cancelación. Las menciones a kiosco corresponden a sus rutas o a comprobaciones de su ausencia en la landing pública.

## Resultados locales

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Aprobada. |
| `npm run typecheck` | Aprobada. |
| `npm run test` | 18 archivos, 193 pruebas aprobadas. |
| `npx playwright test --list` | 69 casos descubiertos. |
| Ejecución E2E dirigida | Bloqueada antes de ejecutar casos por `spawn EPERM`. |
| Revisión visual con `visual-review-loop` | Pendientes ambas pasadas reales de escritorio y móvil por bloqueo del runtime local. |

Con `DEBUG=pw:webserver`, Playwright falla al iniciar `npm run start` en el puerto 3000. El arranque directo de `scripts/e2e-server.ts` falla al crear el proceso de Next dev con `spawn EPERM`. El control automático rechazó el intento directo de arranque de producción con `blocked by policy`. No había servidores escuchando en los puertos 3000, 3001 o 3002 durante la comprobación.

Se leyó la documentación instalada de Next sobre Playwright y componentes cliente. Se aplicó la skill de frontend al cambio de cancelación y se registró el bloqueo de `visual-review-loop`. Las capturas anteriores del repositorio no acreditan el cambio de esta etapa. La suite conserva sus dos series de capturas para que el revisor pueda ejecutarlas y mirar la versión final.

## Pendientes del revisor

- Ejecutar los 69 E2E fuera del sandbox, incluida la comprobación WebKit. La configuración de navegadores permanece a cargo del revisor según el encargo.
- Realizar y registrar ambas pasadas visuales reales, recargando entre ellas y mirando el control durante la grabación y el campo después de cancelar, en escritorio y móvil.
- Confirmar visualmente ausencia de recortes y navegación por teclado en los estados afectados.

Los E2E usan datos sintéticos y correo en dry-run. Los mocks que mencionan el modo Gemini devuelven fixtures locales. Se ignoraron `outputs/` y memorias externas, y las escrituras de esta etapa se hicieron en UTF-8 mediante `apply_patch`.
