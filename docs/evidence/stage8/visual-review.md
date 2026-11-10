# Revisión visual de etapa 8

Estado: **BLOQUEADA, ambas pasadas pendientes**. Fecha: 2026-11-10. Artefacto: árbol local sin commit de esta ejecución.

Se aplicó [visual-review-loop](C:/Users/Atlas/.codex/skills/visual-review-loop/SKILL.md), que exige: «No declares verificación visual completada si falta alguna pasada, el contenido no se llegó a mirar o existen defectos pendientes dentro del alcance». El bloqueo de ejecución impide cumplir las dos inspecciones, así que permanecen pendientes.

| Superficie | Viewports / estados previstos | Pasada 1 | Pasada 2 |
| --- | --- | --- | --- |
| Landing ES/EN | 390 / 1440; navegación, créditos, demo, B2B, móvil | Bloqueada | Bloqueada |
| Bienvenida | ES/EN, casillas vacías, obligatorio/opcional, espera, error, dry-run | Bloqueada | Bloqueada |
| Chat web | 360–1920; teclado, mensajes largos, offline, cuota, direcciones sin QR | Bloqueada | Bloqueada |
| Mis viajes | Vacío, ficha, lugar sin ficha, quitar, fuente | Bloqueada | Bloqueada |
| Mis conversaciones | Verificación, vacío, lista, detalle, continuar, borrar, consentimiento retirado | Bloqueada | Bloqueada |
| Kiosco | 390 / 1280×800 / 1440; avatar, voz, QR, dos dígitos, fin/expiración | Bloqueada | Bloqueada |

Evidencia de bloqueo: `.cache/stage8-build.log`, `.cache/stage8-e2e.log` (archivos locales ignorados). Ambos procesos devuelven `spawn EPERM`. El navegador integrado devuelve `The browser access host is unavailable`. No se han cambiado permisos ni configuración de Next para eludirlo. No se hicieron instalaciones.

Revisión estática (no visual): se corrigieron la copia de mensajes en QR, su pérdida al verificar correo, el destino sin ficha, los consentimientos de marketing pendientes que podían reactivarse tras retirada y el scroller anidado de altura mínima. La revisión estática y las pruebas de markup no demuestran ausencia de cortes ni aceptación visual. Los assets fotográficos fueron vistos; catedral recortada para excluir personas en primer plano.

Ver [plan de capturas](../../screenshots/stage8/README.md) y [diseño](../../STAGE8_DESIGN.md). No se declara la etapa visualmente verificada.
