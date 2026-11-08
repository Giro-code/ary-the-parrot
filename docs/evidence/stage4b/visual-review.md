# Revisión visual 4B · pendiente por entorno

Artefacto: árbol local sin commit, identificado por el inventario y diff de esta etapa. Fecha: 8 de noviembre de 2026. Diseño previo: `docs/ARY_STAGE4B_DESIGN.md`.

Rutas: acceso de personal, admin (analítica, dispositivos, contenidos/preview/puentes, organizaciones, campañas desactivadas, solicitudes B2B y borrados), partner (resumen, ofertas, leads), ofertas/confirmación del visitante y solicitudes/revocación en privacidad. Anchos previstos: 360, 390, 820 y 1440px.

| Pasada | Resultado observado | Evidencia |
| --- | --- | --- |
| 1, inspección crítica | No pudo abrirse la interfaz | CUA `cua.getState()` falló: `failed to write kernel assets: The system cannot find the path specified. (os error 3)`; `next dev` da spawn EPERM |
| Correcciones técnicas | Revisión de código y pruebas, sin aceptación visual | Separación de cookie, foco y etiquetas, tablas con scroll local, wrap, datos pequeños ocultos también en ratio/CSV, estados de error/ocupado y consentimiento desmarcado |
| 2, recarga final | Pendiente; no se miraron capturas | El runtime no llegó a estar disponible. No se afirma equivalencia visual ni 0 píxeles |

No hay capturas nuevas de navegador que puedan acreditarse. `tests/e2e/stage4b.spec.ts` prepara dos recorridos de capturas con nombres de pasada/ruta/ancho en `docs/screenshots/stage4b/`, pero generarlas no cuenta como mirarlas. Incluye estados de permiso denegado y enlace inválido. El revisor debe recorrer también confirmación de campos, recibo, revocación, edición, validación/error y navegación por teclado. Registrar defectos concretos, corregir, recargar y mirar de nuevo. Si corrige después de la pasada final, repetir los estados afectados.

No se cambió configuración ni se instalaron navegadores para rodear el sandbox. La landing y sus activos protegidos no se modificaron; sus hashes y la prueba estática no sustituyen la regresión de píxeles de esta etapa.
