# Capturas de etapa 10B

Pendientes: Playwright y Next dev fallaron al iniciar subprocesos con `spawn EPERM`. No existen capturas verificadas de esta etapa.

`tests/e2e/stage10b.spec.ts` prepara nombres `pass{1|2}-{es|en}-{390|1440}-{card|gallery|lightbox}.png` y `pass{1|2}-staff-{es|en}-{390|1440}.png`. El panel muestra su interfaz existente en español y títulos bilingües. Las galerías reales tienen una sola foto por ficha en el JSON protegido.

Tras ejecutar, cada imagen debe ser abierta e inspeccionada; los archivos por sí solos no acreditan las dos pasadas. Véase `docs/evidence/stage10b/visual-review.md`.
