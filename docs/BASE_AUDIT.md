# Auditoría de la base original

Fecha 7 de noviembre de 2026. Revisión de `legacy/`, su manifiesto y el código completo de la landing, incluido el JavaScript. Base Git `b04db41`, rama `main`, tag `baseline-static-ary`. En este directorio se recibieron los cinco archivos extraídos y `SHA256SUMS`. La integridad de un ZIP no se ha vuelto a comprobar porque el ZIP no está presente.

## Inventario comprobado

| Archivo original | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 53.583 | `bb9c2eff952b53507e149c5cc205aa8ddcee1bcc2d3b8074fdd9f4c4b1224ea8` |
| `brochure.html` | 4.017.913 | `2f1f3ce1fbbdba105f0e7d64587639c52dfbb4d70deac22f5f630e9092ee9827` |
| `assets/ary-la-cotorra.png` | 898.204 | `5b5f818854d287a91f7c07b75b316cb8d3a390ca5f57a79991a7499135800f0f` |
| `assets/don-rafael-prototipo.png` | 2.109.600 | `95987f549661c71fadd5237ac9e7915ce98fbaa8d47f047c4b1f4cb411495b78` |
| `LEEME.txt` | 2.369 | `3e7d9857ad046d233367cfcea24936d253dc40afd421418808bde1e70ecc171c` |

Los cinco hashes coinciden con `legacy/SHA256SUMS`. El manifiesto adicional pesa 433 bytes y su hash es `2ec55748f3290ac0c3c01d0c8e002b62d0a5b03a0bcace3cad17297ffffa0a29`. Las pruebas unitarias vuelven a verificar los cinco originales y las tres copias públicas binarias. `legacy/` permanece intacto.

## Comportamiento observado en el código antes de cambiarlo

- Seis vistas mutuamente excluyentes, `#inicio`, `#conoce`, `#historia`, `#nosotros`, `#brochure` y `#solicitar`. Sin hash se abre inicio. Un hash desconocido se normaliza a `#inicio` mediante `replaceState`.
- El router actualiza `document.title` y `aria-current`. Los cambios de hash cierran el menú, vuelven al inicio del scroll y enfocan `main`. El título de inicio es `Ary la Cotorra · Descubre lo nuestro`. Los demás usan el texto del `h1` seguido de ` · Ary`.
- Menú móvil con botón, `aria-expanded`, clase `open` y cierre por Escape cuando el botón recibe el evento. El código original no contiene un listener global de Escape para toda la navegación.
- Escenarios `aeropuerto`, `restaurante` y `cultural` con contenido, número y aclaración propios. Click, flechas izquierda/derecha, Home y End actualizan `aria-selected`, `tabIndex`, foco y `aria-labelledby`. El hash conserva la vista. La selección del escenario no modifica la URL ni se recupera al recargar.
- `#demo-dialog` usa `showModal()`. Sus tres intereses `cultura`, `comida` y `naturaleza` cambian respuesta preparada, SVG y pie. Usa `aria-pressed` y región viva. El texto identifica su carácter de demostración guiada.
- `#presentation-dialog` contiene tres diapositivas. Al abrir vuelve a la primera. Botones y flechas navegan con límites y botones deshabilitados. Los diálogos tienen cierre explícito, cierre nativo con Escape y cierre al pulsar fuera del rectángulo.
- Formulario local con `name`, `org`, `email`, `place` y `message`. Aplica campos obligatorios, límites y validación de espacios en blanco. El mensaje exige diez caracteres. Genera un `Blob` UTF-8 y descarga `Solicitud-Ary-la-Cotorra.txt`. Cambiar un campo oculta el resultado. El texto informa que la solicitud todavía no se ha enviado.
- Brochure HTML independiente con dos hojas, imágenes embebidas, estilos de impresión, botón que ejecuta `window.print()` y regreso a `index.html#brochure`.
- Skip link, landmarks, encabezados, etiquetas de formulario, navegación ARIA, diálogos y foco forman parte del original. No existen `fetch()`, `localStorage`, framework, backend, sesión, autenticación, BD, correo, QR ni control del robot en esta base.

## LEEME frente a evidencia propia

| Afirmación del LEEME | Verificación propia |
| --- | --- |
| Web sin dependencias externas | HTML, CSS, SVG, JS y assets locales identificados en los archivos |
| Seis vistas, menú, escenarios, demo y presentación | Implementación inspeccionada en el código original y cubierta por los tests nuevos |
| Formulario que genera TXT local | Lógica de validación, Blob y descarga inspeccionada, sin envío de red |
| Brochure imprimible e independiente | Dos hojas, imágenes data URI, `@media print`, botón y enlace de vuelta identificados |
| Sin overflow a 390, 820, 1440 y 1920 px | Afirmación histórica del autor. La comprobación visual propia sigue pendiente por restricciones del entorno |
| Interacciones probadas y ausencia de errores JS | Afirmación histórica del autor. Los E2E propios están escritos, su ejecución está bloqueada |
| Raspberry Pi 4, cuatro servomotores, sensores, Gemini y modelo entrenado | Documentado por el equipo. Operación física, integración y entrenamiento por validar |
| Arajet como oportunidad propuesta | Aclaración de ausencia de alianza conservada literalmente |

El servidor estático original se arrancó en `127.0.0.1:3001`. No se obtuvo una inspección en navegador de ese baseline. Los límites y los resultados actuales figuran en `LEGACY_REGRESSION.md`.
