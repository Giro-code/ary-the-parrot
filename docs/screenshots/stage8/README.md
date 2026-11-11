# Capturas de etapa 8 · pendientes

No se han generado ni revisado capturas de la interfaz en esta ejecución. No se declara revisión visual completada.

El 10 de noviembre de 2026:

- `next build` compiló, pero el siguiente proceso falló con `spawn EPERM`.
- Playwright falló al iniciar con `Error: spawn EPERM`, antes de ejecutar casos.
- El navegador integrado respondió `The browser access host is unavailable`.

`tests/e2e/stage8.spec.ts` prepara capturas independientes `pass1-*` y `pass2-*` a 390 y 1440 px de landing ES/EN, bienvenida ES/EN, chat, Mi cultura, lista/detalle de Mis conversaciones y kiosco con QR. Incluye recarga entre vistas y pruebas de overflow a 360, 390, 430, 768, 1280, 1440 y 1920 px. También prepara emulación iPhone/WebKit y Pixel/Chromium. Ninguna ejecución simulada equivale a Safari iOS o Chrome Android físicos.

Para completar: ejecutar build y E2E en un entorno que permita procesos hijos; abrir y mirar cada captura de la primera pasada, registrar defectos y corregirlos, recargar y mirar las capturas finales de la segunda. Si hay correcciones posteriores, volver a revisar los estados afectados. Generar dos lotes de capturas por sí solo no acredita dos revisiones.

La inspección de las tres fotografías fuente y del recorte final de la catedral sí se realizó con el visor de imágenes. Eso acredita únicamente la selección de assets, no el diseño de la interfaz.
