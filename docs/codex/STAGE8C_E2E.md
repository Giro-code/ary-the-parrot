# Codex — Etapa 8C: adaptar los E2E al diseño de las etapas 8 y 8B

En `D:\Ary The Parrot`. El revisor ejecutó la suite completa de Playwright fuera del sandbox sobre el árbol actual, sin commitear: 54 pasan y 15 fallan. El registro exacto está en `docs/codex/e2e-stage8-failures.log`. No lo versiones: bórralo al terminar.

**Objetivo.** Que los E2E reflejen el diseño **actual** (8 y 8B) sin perder lo que validan: seguridad, privacidad, QR, consentimientos, cuotas, idioma, accesibilidad y sin cortes.

**Regla general.** Cambia el **producto** solo si una prueba revela un fallo real. En ese caso explícalo en el informe.

## Fallos y causas que ve el revisor

1. **`stage8-webkit`.** Falta el ejecutable de WebKit. El revisor lo instala (`npx playwright install webkit`): no toques nada por esto.
2. **`stage8:10` (email welcome).** El botón «Enviar pregunta» está deshabilitado cuando la prueba espera habilitado. Comprueba si es la cuota provisional, el gate de correo o el estado del botón de enviar con el campo vacío. Si el producto es correcto, ajusta la prueba.
3. **`stage3:43`, `stage3:92` y `stage4b:38/51`.** Usan `getByLabel("Correo electrónico")` y la casilla «Solicito conservar Mi cultura…» en `/reingresar`. Ahora la etiqueta es «Tu correo» y la casilla «Acepto el aviso de privacidad».
   - Centraliza los helpers de recuperación en un solo sitio, por ejemplo `tests/e2e/helpers.ts`, y úsalos en todas las suites.
   - El estado de éxito nuevo (pantalla completa y redirección a los 4 s) puede cambiar lo que esperan después del envío.
4. **`stage2:95`.** Espera el encabezado «Guardar y recuperar Mi cultura»; ahora es el título nuevo de `/reingresar`.
5. **`stage4a:36`, `stage8:32` y `stage8:54` (visual).** Pulsan «Usar teclado», que ya no existe porque el campo «Escríbele a Ary…» está siempre visible. Actualiza `askText` y los helpers equivalentes.
6. **`stage6:58`.** `robot-status` termina en `error` cuando se espera `idle` tras cancelar la grabación con el teclado. **Investiga**: puede ser un fallo real del producto al cancelar.
7. **`stage3:110` (visual ×2).** Lo mismo que el punto 3 en las pasadas visuales.

## Comprobaciones

- Busca en `tests/e2e/` cualquier otro texto del diseño antiguo y actualízalo: «Usar teclado», «Correo electrónico», «Solicito conservar», «Guardar y recuperar», «Idioma:», «Un pedacito de Dominicana», «kiosco» en la landing pública, etc.
- `lint`, `typecheck` y `test` deben pasar. El revisor vuelve a ejecutar Playwright.

## Restricciones

- Sin commits, push, despliegues ni correos.
- Sin llamadas reales a Gemini.
- Ignora `outputs/` y las memorias de otros proyectos.
- No traduzcas código.
- Cuidado con la **codificación**: escribe siempre los archivos en UTF-8. En la etapa 8B, unas escrituras vía PowerShell→python convirtieron «ó», «¡», «¿» y «…» en «?». No uses ese método; usa `apply_patch` o escrituras UTF-8 explícitas.

## Entrega

Al terminar, imprime los archivos, las causas reales encontradas y los resultados.
