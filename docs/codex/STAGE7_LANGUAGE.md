# Codex — Etapa 7: idioma automático (inglés por defecto, español por país, voz y teléfono)

Sigues en `D:\Ary The Parrot`. Las etapas 1–6 están hechas, verificadas y desplegadas en https://arytheparrot.app (Vercel + Neon), incluido el chat por voz de la etapa 6.

Lee primero:

- `README.md`
- `docs/ARY_STAGE6_REPORT.md`
- `docs/ARY_AI.md`
- `src/components/*` (`useLocale`, `kiosk.tsx`, `experience.tsx`, `ary-chat.tsx`, `voice-shell.tsx`, `use-ary-voice.ts`)
- `src/conversation.ts`
- `src/server/ai/*`
- `next.config.ts`

En esta versión de Next, `middleware` se llama **`proxy`**. Lee la guía en `node_modules/next/dist/docs/` antes de crear un `proxy.ts` y respeta las deprecaciones.

## Qué pide el propietario

1. **Web.** El idioma por defecto es **inglés**. Si el visitante viene de un **país hispanohablante** según su IP, la web se presenta **automáticamente en español**.
2. **Kiosco y robot.** Siempre arranca en **inglés**, porque en un aeropuerto casi todo el mundo habla inglés.
   - Ofrece siempre en pantalla los botones de idioma.
   - Si el visitante **le habla en español** al acercarse, Ary lo reconoce y **cambia a español solo**.
3. **Teléfono tras el QR.** Al continuar en el móvil se usa el **idioma del teléfono**: si el navegador está en español, español; si no, inglés. Esto vale aunque en el kiosco se hablara otro idioma.
4. **Idiomas.** Por ahora solo **inglés y español**. Más adelante habrá un i18n completo para otros idiomas, así que deja la estructura preparada: un único mapa de idiomas soportados y textos centralizados. No implementes otros idiomas.

## 1. Detección por país en la web

**Lista de países.** Una sola fuente de verdad en `src/i18n.ts`, por ejemplo `SPANISH_SPEAKING_COUNTRIES`:

```text
ES MX GT HN SV NI CR PA CU DO PR CO VE EC PE BO PY CL AR UY GQ
```

**Orden de decisión del idioma**, para la web pública:

1. Elección explícita del visitante: cookie `ary_lang` (`en`|`es`), que se pone al pulsar el selector de idioma. Esa elección siempre gana.
2. País por IP: cabecera de Vercel `x-vercel-ip-country`. Si está en la lista → `es`.
3. Sin país (por ejemplo en local): la primera opción soportada de `Accept-Language`.
4. Si nada aplica: `en`.

La lógica de decisión debe ser una **función pura** con pruebas unitarias. No guardes la IP ni el país en la base de datos ni en logs; úsalos solo para decidir el idioma.

**Cookie `ary_lang`:**

- No es HttpOnly, porque el cliente la lee.
- `SameSite=Lax`, `Secure` en producción, `Path=/` y duración de 1 año.
- Solo guarda `en` o `es`. Es una preferencia funcional y no necesita consentimiento, pero menciónala en `/privacidad`.

**Cabeceras.** `Vary` correcto (`Cookie`, `Accept-Language`) y sin caché compartida que mezcle idiomas. Revisa las cabeceras de caché de la landing estática y de las páginas de la app.

## 2. Landing en inglés sin tocar la española

- `public/index.html`, `public/site/landing.css`, `public/site/landing.js` y `public/brochure.html` **no se modifican**. La regresión de 0 píxeles de la landing en español debe seguir pasando tal cual.
- **Landing en inglés.** Crea `public/en/index.html` como traducción fiel y natural al inglés de la landing actual, con la misma estructura, clases, CSS, imágenes e interacción, y `lang="en"`.
  - Si `landing.js` contiene textos en español visibles (estados del formulario B2B, TXT, etc.), no lo edites: crea `public/site/landing.en.js` como copia con solo los textos traducidos, cargado únicamente por la versión inglesa.
  - Haz lo mismo con el folleto: `public/en/brochure.html`.
  - Traducción cuidada, sin inventar datos nuevos. Términos de producto como «Ary» se mantienen.
- **Enrutado con `proxy.ts`:**
  - Para `/` (y `/index.html`), reescribe internamente a `/en/index.html` cuando el idioma decidido sea `en`, o a `/index.html` cuando sea `es`. Hoy hay un rewrite `beforeFiles` de `/` → `/index.html` en `next.config.ts`; integra esa lógica sin duplicar ni romperla.
  - Igual con `/brochure.html`.
- **Selector de idioma visible** en la landing inglesa y en las páginas de la app: «English | Español».
  - En la landing española no se puede tocar el HTML, así que el selector solo existe en la inglesa. Además, `?lang=es` o `?lang=en` en cualquier URL fija la cookie y redirige limpio, para enlazar «Español» desde la inglesa y «English» desde fuera.
  - Documenta esta limitación.
- **`hreflang` y canonical** en la versión inglesa, y `<link rel="alternate" hreflang>` hacia ambas.

## 3. Páginas de la app (`/experiencia`, `/mi-viaje`, `/privacidad`, `/reingresar`, `/cuenta/*`, `/cultura/*`)

- **Idioma inicial.** Lo decide el servidor (la misma función del punto 1) y se pasa al cliente para que el primer render ya salga en el idioma correcto, sin parpadeo de español a inglés.
- **`useLocale`.** Respeta la cookie y actualiza la cookie al cambiar de idioma.
- **Textos.** Revisa que **todos** los textos visibles de estas páginas tengan versión en inglés. Hoy hay textos solo en español: búscalos y centralízalos.

## 4. Kiosco / robot: inglés por defecto y cambio por voz

**Idioma de arranque.**

- `/kiosco` arranca **siempre en `en`**, sin depender de país, cookie ni `Accept-Language`, porque es un dispositivo de aeropuerto.
- Hazlo configurable con `KIOSK_DEFAULT_LOCALE=en`.
- Tras cada reinicio por inactividad o al terminar, vuelve a `en`.

**Botones de idioma.** Visibles en todo momento en el kiosco: «English», «Español».

**Saludo.** Cuando hay presencia (puente local) o al pulsar Start, Ary saluda en inglés con una invitación bilingüe breve. Por ejemplo, en voz: «Hi! I'm Ary, the Dominican parrot. Ask me anything… ¿o prefieres español?». Los chips de idioma están visibles.

**Detección del idioma hablado.**

- En `/api/voice/ask`, el modelo ya transcribe. Añade al esquema Zod de respuesta `detectedLanguage: "en" | "es" | "other"`, pidiéndolo en la instrucción.
- Si el visitante habla en español estando el kiosco en inglés:
  - el kiosco cambia a español (`setPreferences` con `locale: "es"`);
  - **la respuesta ya viene en español**, así que la instrucción debe decir «responde en el idioma que habló el visitante si es en/es»;
  - la voz TTS sigue en español;
  - y no hay que repetir la pregunta.
- Lo mismo a la inversa: kiosco en español y alguien habla inglés → inglés.
- Para `other`, responde en inglés y menciona amablemente que por ahora habla inglés y español.
- Pon pruebas con proveedor simulado:
  - pregunta en español → `locale` es;
  - pregunta en inglés → `locale` en;
  - `other` → en.

**Texto escrito.** Si el visitante escribe en el teclado del kiosco, usa el mismo campo `detectedLanguage` que devuelve el chat de texto: extiende el esquema de texto igual.

**Robot.** El cambio de idioma no altera el contrato del puente local ni del firmware.

## 5. Teléfono tras el QR

- Al canjear el QR (`/q/[token]` → `/experiencia`), el idioma de la sesión en el móvil se fija por el **idioma del navegador del teléfono**:
  - `Accept-Language` en el servidor durante el canje;
  - y, en el cliente, `navigator.languages` como confirmación.
  - Si es `es*` → `es`; en cualquier otro caso → `en`.
- Actualiza la preferencia `locale` de la sesión restaurada. Los intereses y guardados se conservan.
- Si el visitante ya tenía la cookie `ary_lang` en ese teléfono, gana la cookie.
- El selector de idioma permanece disponible.
- Prueba E2E: kiosco en inglés, contexto móvil de Playwright con `locale: "es-ES"` → `/experiencia` en español; y a la inversa.

## 6. Pruebas

- **Vitest:**
  - función de decisión de idioma: país, cookie, `Accept-Language` y por defecto;
  - lista de países;
  - `detectedLanguage` → cambio de locale;
  - idioma del canje del QR.
- **Playwright.** Simula el país con `extraHTTPHeaders: { "x-vercel-ip-country": "MX" }` y `"US"` contra el servidor local, que el `proxy` debe leer igual que en Vercel:
  - `/` en inglés (US) y en español (MX);
  - `?lang=` fija la cookie;
  - el kiosco arranca en inglés aunque el país sea MX;
  - el cambio a español por voz (proveedor simulado);
  - el teléfono adopta su idioma tras el QR.
- **Landing.** La landing en español mantiene 0 píxeles. Captura también la inglesa a 4 anchos en `docs/screenshots/stage7/`.
- **Comprobaciones:** `lint`, `typecheck`, `test` y `build` deben pasar, o documenta el error exacto del sandbox.

## Restricciones

- No hagas commits, push ni despliegues. No envíes correos.
- No hagas llamadas reales a Gemini: los tests siempre con proveedor simulado.
- No toques `legacy/` ni los archivos de la landing española.
- Ignora memorias de otros proyectos y la carpeta `outputs/`, que no es de este proyecto. Gemini está autorizado como proveedor de Ary: no existe ninguna prohibición.
- No metas rodeos de sandbox en la configuración. El disco es limitado: no generes logs enormes.

## Entrega

Al terminar, imprime:

- archivos;
- variables nuevas;
- cómo se decide el idioma, con un diagrama corto;
- los comandos con su resultado;
- los bloqueos.
