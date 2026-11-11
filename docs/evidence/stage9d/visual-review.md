# Etapa 9D — revisión visual pendiente

Fecha: 2026-11-11. Árbol local de trabajo, sin commit ni despliegue.

Se aplicó `C:/Users/Atlas/.codex/skills/visual-review-loop/SKILL.md`. Su requisito es «al menos dos pasadas visuales reales» y «No declares verificación visual completada si falta alguna pasada». No se pudo observar la interfaz nueva en ejecución. La revisión de código y los tests unitarios no sustituyen esas pasadas.

## Bloqueos observados

- `npx playwright test --project=stage9d --workers=1`: `Error: spawn EPERM`, antes de ejecutar casos.
- `node scripts/e2e-server.ts`: el proceso dedicado prepara sus fixtures sintéticos en `.cache`, pero Next dev falla al hacer `fork` en `next-dev.js`, con `spawn EPERM`.
- `npm run build:empty-env`: compila con Turbopack; no puede iniciar el paso TypeScript por `spawn EPERM`.
- Inventario de CUA: `browsers: []`, `The browser access host is unavailable`. Hay aplicaciones nativas abiertas, entre ellas Edge, pero no se obtuvo un servidor local operativo para inspeccionar esta implementación. No se visitó producción como sustituto.

No se cambiaron permisos, bundler ni configuración de workers para eludir estas restricciones. No hay capturas nuevas ni aceptación visual declarada.

## Recorrido preparado

`tests/e2e/stage9d.spec.ts` contiene dos recorridos independientes. Cada combinación entra por correo sintético y recarga antes de capturar. Captura ES/EN en 390, 768 y 1440 px, altura 900, con proveedor de voz simulado:

1. Voz inactiva: Ary centrado, botón circular, sin editor de texto.
2. Escuchando: indicador muy visible, estado, tiempo y nivel.
3. Hablando con ficha: subtítulos, foto y acciones del carrusel.
4. Chat: historial, editor compacto y vuelta a Voz.

Destinos: `docs/screenshots/stage9d/pass-{1|2}-{es|en}-{390|768|1440}-{idle|listening|speaking-card|chat}.png`.

El revisor debe ejecutar la primera pasada, mirar las capturas y recorrer interacción, corregir defectos y después recargar para la segunda. Si se corrige tras la segunda, volver a mirar los estados afectados. Ampliar la comprobación de bordes a 360, 430 y 1920 px; comprobar teclado, foco del consentimiento, pausa, interrupción, permiso denegado, falta de capacidades, TTS fallido, offline y QR del kiosco. Probar `prefers-reduced-motion` y audio/micrófono físicos en móvil antes de aceptar autoplay y acústica.

## Hallazgos de revisión de código

Estos son hallazgos estáticos, no defectos observados en capturas:

- El `flex-basis` de la miniatura heredada podía impedir que Ary creciera: corregido con `flex: none` y tamaños de imagen apropiados para Voz.
- El consentimiento debía conservar proveedor, no almacenamiento y límite de captura al explicar los turnos automáticos: corregido; Chat conserva la explicación manual.
- Un saludo pendiente podía reanudarse después de pausar o cambiar de modo: invalidado mediante una generación de inicio.
- Los seguimientos no deben quedar bloqueados por la escucha automática: su envío cancela y descarta la captura y conserva los turnos automáticos ya autorizados.
- El fallback tras dos errores no debe intentar reproducir de nuevo el saludo al abrir Chat: corregido.

Pasada visual 1: **pendiente**. Pasada visual 2: **pendiente**. No se atribuye evidencia de proveedor real, puente físico ni producción a los fixtures.
