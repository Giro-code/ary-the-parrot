# Etapa 6 · revisión visual pendiente

Artefacto: árbol de trabajo de `D:\Ary The Parrot`, 10 de noviembre de 2026, sin commit. Se retomaron los cambios existentes; no se leyó `outputs/` ni se reutilizaron memorias de otros proyectos.

## Alcance y diseño conservado

Visitante de kiosco/familias y móvil; acción principal hablar con Ary, con teclado secundario. Se conserva la dirección verde/papel y las cuatro ilustraciones WebP proporcionadas. Estructura: `VoiceShell → AryChat → AryStage + conversación + fichas/QR + compositor`; `useAryVoice` administra un único audio y MediaRecorder. Los estados compartidos alimentan escenario y puente. No se introduce una biblioteca de UI/audio.

Riesgos revisados en código: demasiados controles (micrófono central y secundarios discretos); texto largo (burbujas con wrapping y fichas breves); poco espacio móvil (conversación con scroll propio y compositor persistente); estado de habla fingido (eventos del audio); permiso confuso (diálogo previo, aviso del proveedor y teclado). Esto es revisión técnica, no inspección visual.

| Pasada requerida | Estado real | Bloqueo actual |
| --- | --- | --- |
| 1: inspección crítica, escritorio y móvil | PENDIENTE | `npm run dev`: `spawn EPERM`, errno -4048, `next-dev.js:393:45`. Ningún servidor de la app accesible en 3000/3002 |
| Correcciones técnicas | REALIZADAS | Cancelar pistas al cambiar a teclado; mute no cancela la transcripción; error de reproducción honesto; scroll limitado a la conversación; wrapping de texto; fallback gris solo cuando falta el asset; celebración 2,5 s |
| 2: recarga e inspección final | PENDIENTE | `npm run test:e2e -- --project=stage6 --reporter=line --trace=off`: `Error: spawn EPERM` antes de ejecutar los casos |

**No se generaron ni se miraron capturas nuevas de etapa 6.** No se afirma revisión visual, aceptación de la voz ni cero píxeles de diferencia de esta versión. El build compila y después falla al lanzar TypeScript con `spawn EPERM`. No se modificó la configuración para evitar el sandbox ni se instalaron navegadores.

## Recorrido preparado para el revisor

`tests/e2e/stage6.spec.ts` prepara dos recorridos independientes con navegación/recarga para 1280×800, 1920×1080, 390×844 y 360×800. Archivos futuros en `docs/screenshots/stage6/pass-<1|2>-<estado>-<ancho>.png`: presentar, escuchando/pensar, hablando con fichas/mostrar, celebrar, offline/fallback y derivación sensible móvil. Las rutas de estos archivos son destinos, no evidencia ya existente.

Ejecutar primero lint/typecheck/tests/build y los E2E en un runtime autorizado. Inspeccionar realmente la pasada 1, corregir hallazgos del alcance y recargar la versión final para la pasada 2. Recorrer además QR con código privado/TTL, guardados, cancelación, inactividad 90 s, permiso denegado, teclado/foco, mute, errores de TTS, cancelación del micro, inglés, reduced-motion y recuperar conexión. Revisar pequeños altos/teclado virtual en dispositivo además de overflow horizontal. No guardar tokens QR en evidencia pública; usar únicamente las fixtures sintéticas.

La landing y `legacy/` no tienen cambios de fuente, y sus pruebas de preservación pasan. La comparación visual de 0 píxeles debe ejecutarse: la ausencia de diff no la sustituye. El micrófono real, autoplay, Pi y puente físico siguen pendientes; las fixtures de voz/SSE no los certifican.
