# Etapa 9B

## Resultado local

Implementados los cambios del encargo. La ejecución E2E y la aceptación visual continúan pendientes por los bloqueos de entorno registrados abajo.

## Causas y correcciones

| Fallo original | Causa encontrada | Cambio |
| --- | --- | --- |
| stage9, diálogo de foto | El diálogo modal nativo permitía salir del ciclo de controles con Tab según el registro del revisor. | Foco inicial en cerrar, ciclo explícito de Tab y Shift+Tab y devolución al disparador al desmontar. El E2E conserva Escape y amplía cobertura de recorrido inverso y kiosco con un único control. |
| stage9, dos recorridos visuales | Recargar después de iniciar el kiosco ejecuta su limpieza y lo devuelve a inicio. La prueba intentaba escribir inmediatamente después. | Recarga previa al inicio de la sesión y comprobación del botón Start antes de comenzar la conversación. |
| stage4a, citas en kiosco | La etapa 9 presenta la fuente como texto en kiosco. El selector antiguo esperaba href. | Comprobación del editor UNESCO y de la supresión de enlaces externos en las tarjetas. |
| stage4a, historial móvil y texto no confiable | El selector contaba todas las imágenes del historial, incluida la foto legítima de la respuesta anterior. | Comprobación de la burbuja concreta que recibe el texto inyectado y conservación del control de ejecución del payload. |
| stage6, dos recorridos visuales | La pose mostrar depende de una fuente con imagen. El fixture de voz omitía los medios del catálogo. | Fixture con image y mapsUrl reales del catálogo sintético y comprobación explícita de image. |
| Bienvenida en escritorio | La regla email-welcome limitaba el ancho a 560 px mientras account-journey reservaba 300 px y 48 px de separación. El shell imponía 100dvh y el formulario tenía overflow-y auto. | Modo de cuenta con altura automática y scroll de documento. Grid de máximo 980 px, ilustración de 320 px, separación de 40 px y contenido mínimo de 420 px desde 900 px. Una columna en anchos inferiores. |

## Diseño y estados

Árbol de la bienvenida implementada `Experience → VoiceShell → EmailWelcome → AccountArt + account-content → EmailSteps + account-form`.

Se conserva la identidad gráfica de papel cálido, verdes, tipografías e ilustraciones existentes. Se eligió un sello caribeño con palma para el SVG cultural hecho a mano.

| Riesgo revisado | Ajuste implementado |
| --- | --- |
| Formulario comprimido | Ancho disponible del grid y contenido mínimo explícito. |
| Scroll dentro de la bienvenida | Altura automática del modo de cuenta y scroll del documento. |
| Pasos partidos en escritorio | Chips sin salto de línea desde el breakpoint de escritorio. |
| Botón partido | Texto en una línea en escritorio y comprobación de rectángulos de texto en E2E. |
| Adaptación de cuenta y estado vacío | Grid de una columna en móvil, contenido con min-width 0 y estado vacío cultural con Ary. |

La suite nueva cubre bienvenida, recuperación, enlace inválido, cuenta sin verificar y colección vacía en ES/EN a 390, 768, 1280 y 1920 px. Incluye error recuperable de bienvenida, scroll con escritorio de poca altura y guardado en inglés. Los recorridos existentes cubren chat, carrusel, Maps, ficha pública, guardados poblados, voz y kiosco.

## Mi cultura

- Navegación y botones con Mi cultura / My culture y Save to My culture.
- Página principal en `/mi-cultura`, título Tu colección cultural / Your cultural collection, subtítulo cultural y estado vacío con Ary.
- Redirección 308 de `/mi-viaje` a `/mi-cultura` mediante next.config, con conservación del query. La antigua página contiene además permanentRedirect para su entrada de página.
- Textos actualizados en los diccionarios, cabeceras, chat, carrusel, respuestas deterministas de Ary, plantillas de correo, privacidad, términos y documentación.
- La búsqueda final encontró las denominaciones antiguas únicamente en las comprobaciones de ausencia y en el documento original del encargo.

## Comprobaciones de la versión final

| Comprobación | Resultado |
| --- | --- |
| npm run lint | PASS, salida 0. |
| npm run typecheck | PASS, salida 0. |
| npm test | PASS, 19 archivos y 234 pruebas. |
| npx playwright test --list | 79 casos descubiertos en 10 archivos. |
| npx playwright test | Bloqueado antes de ejecutar casos por Error spawn EPERM. |
| npm run build | Compilación Turbopack completada en 6,8 s. El paso TypeScript termina con spawn EPERM. |
| git -c core.whitespace=cr-at-eol diff --check | PASS. Se admiten los finales CRLF existentes. |
| Codificación | Los archivos de texto editados se escribieron mediante apply_patch en UTF-8. |

Comprobación HTTP local con datos sintéticos aislados, realizada el 11 de noviembre de 2026 a las 03:52 UTC.

| Ruta o contrato | ES | EN |
| --- | --- | --- |
| GET /mi-viaje?lang=… sin seguir redirecciones | 308 | 308 |
| Destino de la redirección | /mi-cultura?lang=es | /mi-cultura?lang=en |
| Selección de idioma en /mi-cultura?lang=… | 307 y cookie de idioma | 307 y cookie de idioma |
| /mi-cultura y título cultural renderizado | 200 | 200 |
| /experiencia | 200 | 200 |
| /reingresar | 200 | 200 |
| /cuenta/privacidad | 200 | 200 |
| /auth/verify con token inválido | 200 | 200 |
| /privacidad y /terminos | 200 | 200 |

La prueba HTTP de auth/start encontró un 500 con spawn EPERM al preparar la ruta API en este runtime. La comprobación HTTP completada cubre el renderizado del servidor y las redirecciones. Las pruebas de lógica y persistencia están cubiertas por Vitest.

## Revisión visual pendiente

Se aplicó visual-review-loop y se intentó habilitar la revisión real. El inventario del navegador informó `The browser access host is unavailable`. El acceso a la ventana existente de Edge fue rechazado con `Computer Use was not approved to use Microsoft Edge`. Playwright terminó antes de ejecutar casos por `spawn EPERM`.

La primera inspección y la segunda inspección tras recargar siguen pendientes. Las capturas preparadas por `tests/e2e/stage9b.spec.ts` se guardarán en `docs/screenshots/stage9b/`. Esta entrega carece de nuevas capturas de interfaz y de validación visual de tamaños, foco, interacciones y ausencia de overflow.

El servidor temporal utilizó la misma preparación sintética del E2E y una selección temporal de la API de TypeScript en memoria para permitir las comprobaciones HTTP. Se cerró al terminar. Los dos archivos auxiliares locales se eliminaron.

## Archivos modificados en esta tarea

### Aplicación y textos de producto

- `app/globals.css`
- `app/mi-cultura/page.tsx`
- `app/mi-viaje/page.tsx`
- `app/stage8.css`
- `next.config.ts`
- `playwright.config.ts`
- `src/components/ary-chat.tsx`
- `src/components/email-welcome.tsx`
- `src/components/experience.tsx`
- `src/components/icons.tsx`
- `src/components/information.tsx`
- `src/components/item-photo.tsx`
- `src/components/recovery.tsx`
- `src/components/shared.tsx`
- `src/components/source-carousel.tsx`
- `src/components/terms.tsx`
- `src/components/trip.tsx`
- `src/components/voice-shell.tsx`
- `src/i18n.ts`
- `src/i18n/ui.ts`
- `src/server/ai/chat.ts`
- `src/server/email/templates.ts`

### Pruebas

- `tests/e2e/stage2.spec.ts`
- `tests/e2e/stage3.spec.ts`
- `tests/e2e/stage4a.spec.ts`
- `tests/e2e/stage4b.spec.ts`
- `tests/e2e/stage6.spec.ts`
- `tests/e2e/stage7.spec.ts`
- `tests/e2e/stage8.spec.ts`
- `tests/e2e/stage9.spec.ts`
- `tests/e2e/stage9b.spec.ts`
- `tests/e2e/warmup.ts`
- `tests/unit/config.test.ts`
- `tests/unit/language-render.test.tsx`
- `tests/unit/stage8-ui.test.tsx`
- `tests/unit/stage9.test.tsx`

### Documentación

- `README.md`
- `docs/ARY_AI.md`
- `docs/ARY_EMAIL_SETUP.md`
- `docs/ARY_IMPLEMENTATION_PLAN.md`
- `docs/ARY_OPERATOR_AND_PARTNER.md`
- `docs/ARY_PROMPT_MAESTRO.md`
- `docs/ARY_SECURITY_AND_PRIVACY.md`
- `docs/ARY_STAGE3_DESIGN.md`
- `docs/ARY_STAGE3_REPORT.md`
- `docs/ARY_STAGE4B_REPORT.md`
- `docs/ARY_STAGE8C_REPORT.md`
- `docs/ARY_STAGE8_REPORT.md`
- `docs/ARY_STAGE9_REPORT.md`
- `docs/ARY_WRO_DEMO_SCRIPT.md`
- `docs/FEATURE_MATRIX.md`
- `docs/PRIVACY_COMPLIANCE_REVIEW.md`
- `docs/PROPUESTA_ORGANIZACION_Y_DISENO.md`
- `docs/STAGE8_DESIGN.md`
- `docs/VISUAL_REVIEW.md`
- `docs/WRO_TECH_DIAGRAM.md`
- `docs/codex/STAGE2.md`
- `docs/codex/STAGE3.md`
- `docs/codex/STAGE4B.md`
- `docs/codex/STAGE7_LANGUAGE.md`
- `docs/codex/STAGE8B_UX_POLISH.md`
- `docs/codex/STAGE8C_E2E.md`
- `docs/codex/STAGE8_REDESIGN.md`
- `docs/codex/STAGE9_PLACES_MEDIA.md`
- `docs/evidence/stage8/visual-review.md`
- `docs/evidence/stage9/visual-review.md`
- `docs/screenshots/stage8/README.md`
- `docs/screenshots/stage9/README.md`

### Informe y limpieza

- `docs/ARY_STAGE9B_REPORT.md`, este informe.
- `docs/codex/e2e-stage9-failures.log`, eliminado según el encargo.

La lista identifica los archivos editados durante 9B. El árbol también contiene el trabajo previo de etapa 9 indicado en el encargo.

