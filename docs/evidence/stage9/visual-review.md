# Revisión visual de etapa 9

## Alcance y diseño

Rutas `/experiencia`, `/kiosco`, `/mi-cultura` y `/cultura/[id]`. Objetivo del visitante, reconocer el tema mediante una fotografía, ampliar el detalle y abrir la ubicación verificada. Acción de ubicación mediante chip y botón Maps en web, con continuación por QR en kiosco. Se conserva la identidad de papel cálido, verdes, tipografía y shell de etapa 8.

Árbol implementado `AryChat → SourceCarousel → ItemPhoto / MapsLink`, compartiendo `ItemPhoto` y `MapsLink` con las fichas de Mi cultura y la ficha pública. Una tarjeta ocupa el ancho disponible. Varias usan una pista horizontal con scroll-snap e indicadores accionables. Se mantienen carga, errores, guardado, botones deshabilitados, ausencia de media y flujo de voz existentes. El diálogo nativo utiliza título accesible, cierre explícito y cancelación con Esc.

Riesgos revisados en código antes de implementar, con créditos largos envueltos, fotos ausentes sin placeholder, contención del ancho de la pista móvil, foco mediante diálogo modal nativo y supresión de enlaces externos dentro de las tarjetas del kiosco. Los casos de teclado y foco están preparados en Playwright.

## Inspección de assets realizada

El 10 de noviembre de 2026 se abrió y miró la hoja de contacto de las diez fotografías seleccionadas en un visor de imágenes. Evidencia `photos-contact-sheet.png`, generada desde los WebP locales. Se revisaron pertinencia del tema, marcas de agua, personas y encuadre. Merengue y Bachata son actuaciones públicas identificadas en sus páginas de Commons. Carnaval muestra un personaje enmascarado en evento público. Los demás assets seleccionados muestran arquitectura, paisaje, material o alimento.

Se corrigió el alt de Mangú para describir únicamente el plato visible. Las imágenes verticales y muy panorámicas se configuran con object-fit contain para conservar su contenido. Los originales de la etapa 8 permanecen en su carpeta. La inspección de assets se completó antes del último build.

## Pasada 1 de interfaz pendiente

Se intentó iniciar el servidor local mediante `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3019`, con base de datos y Gemini desactivados y correo en dry-run. El proceso terminó con `Error: spawn EPERM` en `next-dev.js`, al ejecutar `child_process.fork`. Playwright también terminó con `Error: spawn EPERM` antes de ejecutar casos. La consulta de disponibilidad del navegador integrado informó `The browser access host is unavailable`.

Falta abrir la interfaz implementada a 390 y 1440 px, recorrer el chat, carrusel, diálogo, ubicación, ficha pública, Mi cultura y kiosco, y mirar las capturas a tamaño legible. También siguen pendientes los anchos 360 y 768 px y los estados alternativos de ausencia de imagen/ubicación, error y carga en navegador.

## Pasada 2 de interfaz pendiente

Falta recargar la versión final y repetir escritorio/móvil e interacciones afectadas después de corregir los defectos de la primera inspección. `tests/e2e/stage9.spec.ts` incluye recorridos separados `visual pass 1` y `visual pass 2`, con capturas identificadas en `docs/screenshots/stage9/`. Su ejecución automática deberá acompañarse de la inspección real de esas capturas y del registro de hallazgos.

## Límites

Las 229 pruebas unitarias verifican la lógica de servidor, los datos y markup. El inventario Playwright confirma que los seis casos se descubren. La interfaz sigue con verificación visual pendiente, incluidos overflow, foco real y comportamiento en dispositivos. Los errores del entorno impidieron obtener las capturas solicitadas.
