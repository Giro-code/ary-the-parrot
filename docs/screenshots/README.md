# Evidencia visual pendiente

Fecha local 7 de noviembre de 2026. La instalación Chromium y el runner Playwright están bloqueados por `spawn EPERM`. El navegador de Computer Use tampoco está autorizado o disponible. Aún no hay capturas propias en este directorio. Las dos pasadas de `visual-review-loop` siguen pendientes.

## Salidas previstas de la suite

Por cada vista `inicio`, `conoce`, `historia`, `nosotros`, `brochure`, `solicitar`, y ancho `390`, `820`, `1440`, `1920`

- `{vista}-{ancho}-legacy.png` muestra la referencia original completa.
- `{vista}-{ancho}-app.png` muestra el resultado nuevo completo, incluida la entrada secundaria.
- `inicio-{ancho}-compared.png` muestra inicio con solo `.experience-entry` retirado para medir conservación del resto.
- `{vista}-{ancho}-diff.png` muestra las diferencias calculadas.
- `{vista}-{ancho}-comparison.json` registra píxeles distintos, dimensiones, fracción y exclusión aplicada.

Se usa viewport de 900 px de alto, captura de página completa, imágenes decodificadas y animaciones desactivadas. Los PNG se recomprimen sin pérdida con deflate 9. La tolerancia máxima es 0,001 de los píxeles, con sensibilidad pixelmatch 0,1.

Después hay que mirar las imágenes legibles, recorrer los estados críticos y registrar dos inspecciones independientes de la versión final tras recargar. Generar PNG no completa esas pasadas. Los bloqueos están en `../LEGACY_REGRESSION.md`.
