
## Verificación del revisor (2026-11-10)

- `lint`, `typecheck`, 171 pruebas unitarias y `build`: **PASS**.
- Playwright: **113 pasan y 1 se omite**. La etapa 7 se integró como proyecto de `playwright.config.ts`, con precalentamiento de rutas; se eliminó `playwright.stage7.config.ts`.
- **Correcciones de producto:**
  - `proxy.ts` reescribía `/index.html` y `/brochure.html` a sí mismos. En `next start` eso entraba en bucle y daba **500** en la portada. Ahora solo reescribe si el destino cambia, construye la URL desde `request.url` y excluye `/api/` del matcher, porque pisaba el `Cache-Control: no-store` de la API.
  - `landing.en.js`: la traducción automática había cambiado código. `createElement("a")` y `querySelectorAll("a")` estaban como `"to"`, lo que rompía la descarga del TXT y el estado del menú. Se comprobó que el esqueleto de código, quitando cadenas, es idéntico al de `landing.js`.
- **Ajustes de pruebas:**
  - el kiosco ahora arranca en inglés;
  - la elección de idioma se recuerda por cookie;
  - el kiosco limpia la sesión al cargar, así que las pruebas esperan a que esté listo.
