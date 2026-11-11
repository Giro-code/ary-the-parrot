# Codex — Etapa 8: rediseño cultural, correo al inicio, conversaciones y respuestas más abiertas

Sigues en `D:\Ary The Parrot`. Las etapas 1–7 están hechas y verificadas, y la web está desplegada en https://arytheparrot.app con chat por voz (etapa 6) e idioma automático (etapa 7).

Lee primero:

- `README.md`
- `docs/ARY_STAGE6_REPORT.md` y el informe de etapa 7
- `docs/ARY_AI.md`
- `src/components/*`, `src/server/ai/*`, `src/server/auth.ts`, `src/server/consents.ts`, `src/server/email/*`, `src/i18n*`
- `public/index.html`, `public/en/index.html`, `public/site/*`

En esta versión de Next, `middleware` se llama `proxy`. Lee `node_modules/next/dist/docs/` antes de tocar la configuración.

## Cambio de regla importante

**El propietario pide ahora rediseñar la landing.** Se levanta la restricción de «0 píxeles» sobre `public/index.html`, `public/en/index.html`, `landing.css`, `landing.js` y los brochures.

- `legacy/` se conserva intacto como archivo histórico. Ni se toca ni se borra.
- Las pruebas de regresión de píxeles contra legacy dejan de exigir igualdad. Sustitúyelas por pruebas funcionales de la nueva landing: navegación, formulario B2B, enlaces, accesibilidad, sin scroll horizontal, en ES y EN.
- Explica el cambio en `docs/LEGACY_REGRESSION.md`.

## Lo que pidió el propietario, revisando la web en móvil y PC

Capturas resumidas:

1. **«No se ve muy bien, se ve cortado».**
   - En PC y en móvil, el escenario de Ary ocupa demasiado.
   - El chat queda apretado en una caja con scroll interno, con las burbujas cortadas a la izquierda.
   - El texto de la barra inferior se corta.
2. **El escenario de Ary debe ser muy pequeño.** Hoy es casi media pantalla.
3. **Quitar «Idioma: ES».** Estilo **profesional**.
4. **«Sigue dando respuestas por defecto a otro tipo de preguntas».** Ver la sección 3.
5. **Correo al inicio**, como medida antiabuso y para recopilar información, con dos casillas:
   - acepto términos y condiciones (obligatoria);
   - correos de promoción (opcional).

   Al pedir el correo debe aparecer **Ary saludando** y un **SVG bonito de un sobre/correo**, explicando que el correo es para **dar seguimiento a las conversaciones**.
6. **QR en el kiosco.** Si en la conversación se detecta una **solicitud de llegar a algún sitio** (cómo llego, dónde queda, quiero ir), Ary presenta el **QR** para seguir esa misma conversación en el teléfono.
   - Esto **no** debe pasar en la web, donde ya hay correo: el visitante ya está en su dispositivo.
   - En la web, en su lugar, Ary ofrece guardar el lugar en «Mi cultura».
7. **Faltan iconos SVG** para identificar secciones:
   - La colección se presenta como **«Mi cultura»**;
   - «Mis datos» pasa a **«Mis conversaciones»**.
8. **Landing:**
   - Cambiar las flechas (→ ↗) por **otros SVG**.
   - Formato visual **más cultural**, con **imágenes de distintos lugares culturales de República Dominicana**.
   - **Quitar «kiosco»** de la web pública: «Explorar Ary · kiosco y móvil» y similares.
   - En su lugar, **«Habla con Ary»**: Ary con una **burbuja de diálogo**; al pulsar a Ary o la burbuja, te lleva a la experiencia.

## 1. Layout del chat: compacto y profesional (`/experiencia`, y `/kiosco` con sus tamaños)

**Escenario de Ary.**

- Pasa a ser una franja **pequeña**: avatar de 56–72 px en móvil y de 80–96 px en PC, con el estado de Ary al lado («Escuchando…», «Pensando…»).
- No hay título grande «Un pedacito de Dominicana» dentro del chat.
- El cambio de imagen por estado se mantiene, ahora a ese tamaño.
- **Kiosco.** El avatar puede ser algo mayor (≤ 160 px en 1280×800), pero el chat es lo principal.

**Estructura tipo app de mensajería.**

- Cabecera compacta: logo, «Mi cultura», «Mis conversaciones» con sus iconos y el selector EN/ES discreto.
- La lista de mensajes ocupa **todo el alto restante** con scroll de página o del contenedor principal, **nunca** una caja pequeña con scroll interno dentro de la página.
- Barra de entrada fija abajo con el micrófono, que incluye `safe-area-inset-bottom` en iOS.
- Usa `100dvh` y prueba Safari iOS y Chrome Android en las anchuras.

**Burbujas.**

- Nada cortado: comprueba `overflow`, `min-width: 0` y paddings.
- Ancho máximo legible en PC: columna central de unos 760 px.

**Textos legales.** «Voz enviada a Google IA · Ary no guarda el audio · Privacidad» pasa a una línea fina o a un icono de información.

**«Más para tu viaje» y enlaces sueltos** («Ver mis guardados», «Finalizar mi sesión») se integran en la cabecera o en un menú, para que no rompan el diseño.

**Pruebas sin scroll horizontal** a 360, 390, 430, 768, 1280, 1440 y 1920 px, sin contenido cortado. Revisa las capturas tú mismo y documenta lo que viste.

## 2. Correo al inicio en la web (no en el kiosco)

**Pantalla de bienvenida de `/experiencia`, antes del chat:**

- Ary saludando (`ary-presentar.webp`) y un **SVG propio de un sobre** con un detalle cultural sutil, por ejemplo un sello con la cotorra o el mar Caribe.
  - Hecho a mano en SVG inline, accesible (`role="img"` y `aria-label`) y con los colores de la marca.
- Texto: Ary pide tu correo para **guardar y darte seguimiento a tus conversaciones y colección cultural**.
- Campo de correo y casillas:
  - **Obligatoria y desmarcada:** «Acepto los Términos y Condiciones y la Política de Privacidad», con enlaces.
  - **Opcional y desmarcada:** «Quiero recibir novedades y promociones de Ary por correo».
- Botón «Empezar a hablar con Ary».

**Verificación y antiabuso.**

- Al enviar, se manda un enlace de verificación usando la infraestructura existente de enlaces mágicos y outbox.
- **Para no frenar al visitante**, puede empezar a chatear enseguida con un **cupo limitado sin verificar**, por ejemplo 5 preguntas. Después, Ary pide que confirme el correo para seguir.
- Rate limits por correo (HMAC) y por IP, con el sistema existente.
- Correos desechables: lista pequeña de bloqueo **opcional**, documentada, sin dependencias externas.
- Si el visitante ya tiene sesión verificada (cookie), no se le vuelve a pedir.

**Consentimientos granulares.** Se guardan en `consent_records`, con versión y prueba:

- `terms` (aceptación de términos);
- `conversation_history` (guardar conversaciones);
- `marketing` (promociones, **double opt-in**, como ya existe).

Nada premarcado. Retirada desde «Mis conversaciones» o la privacidad.

**Página nueva `/terminos` (ES/EN).** Términos de uso razonables para un servicio cultural con IA:

- uso permitido;
- la IA puede equivocarse;
- no es asesoría de viaje ni de vuelos;
- menores con supervisión;
- contacto.

Debe llevar el aviso visible **«Borrador pendiente de revisión legal»**. No inventes razón social ni datos legales: usa marcadores claros.

**Kiosco.** El kiosco **no** pide correo, porque es un dispositivo público. Sigue con el QR. Cuando el visitante continúa en su teléfono, **ahí sí** se le pide el correo con la misma pantalla.

**Comprobación del correo.**

- Revisa y documenta el estado real del sistema de correo en producción. Hoy está en `EMAIL_DRY_RUN=true` y sin `RESEND_API_KEY`, así que **no se envían correos reales**.
- Deja todo listo para que, al poner `RESEND_API_KEY`, `EMAIL_FROM` y `EMAIL_DRY_RUN=false` en Vercel, funcione.
- Mientras sea dry-run, la UI debe decirlo con honestidad en la pantalla de correo: «Modo prueba: el correo de verificación no se envía todavía». No finjas éxito.
- Añade al informe los pasos exactos para el propietario.

## 3. Ary responde a más tipos de preguntas

Hoy, si la pregunta no casa con una ficha publicada, Ary cae en «Respuestas de ejemplo». El propietario quiere una conversación natural.

**Nueva intención `general`**, para charla y preguntas generales de República Dominicana o viajes que no estén en las fichas: saludos, «¿cómo estás?», «¿qué me recomiendas hacer en Santo Domingo?», clima en general, costumbres o frases típicas.

- Ary responde con el conocimiento del modelo, en tono cálido y **breve**, **sin** cifras concretas, precios, horarios ni afirmaciones verificables específicas.
- Si hace falta precisión, sugiere consultar fuentes oficiales.
- Esas respuestas se marcan en la UI con una etiqueta discreta, «Respuesta general de IA», distinta de las respuestas con ficha y fuente.
- Si una ficha publicada encaja, se cita como hasta ahora.

**Se mantienen:**

- redirección de temas sensibles (salud, legal, emergencias, vuelos y puertas, que van al personal del aeropuerto);
- defensa ante inyección;
- prohibición de URLs y HTML en la salida;
- límites y `ai_usage` sin texto.

**Demo.** «Respuestas de ejemplo» queda **solo** cuando el proveedor falla (timeout, 503 o sin clave). En ese caso el mensaje es honesto y amable: «Ahora mismo no puedo pensar bien, ¿lo intentamos otra vez?», más la ficha relacionada si la hay.

**Pruebas** con proveedor simulado: general sin cita → modo gemini con etiqueta general; cultura sin cita → demo; sensible → redirección.

## 4. Intención «llegar a un sitio» → QR (solo kiosco)

- Añade `intent: "directions"` al esquema de respuesta: «¿cómo llego a…?», «¿dónde queda…?», «quiero ir a…», en ES y EN.
- **En el kiosco:**
  - Ary responde brevemente y **presenta el QR dentro del chat** con el código de 2 dígitos: «Te paso esto a tu teléfono para que sigas la conversación y llegues fácil».
  - La conversación y el lugar viajan al teléfono con el mecanismo seguro existente.
  - Ary pone la imagen `ary-mostrar`.
- **En la web**, sin QR: ofrece «Guardar en Mi cultura» y, si hay ficha, «Abrir».
- Nunca des indicaciones de ruta inventadas ni enlaces de mapas generados por la IA. Si hay una ficha con ubicación, se muestra la de la ficha.

## 5. «Mi cultura» y «Mis conversaciones»

- **«Mi cultura»** (ES) / «My culture» (EN), con su icono SVG.
- **«Mis datos» → «Mis conversaciones»** / «My conversations», con su icono SVG.
  - Con correo verificado y consentimiento `conversation_history`, se guardan las conversaciones del visitante en la base de datos.
  - Cifradas con la clave existente, con retención configurable `CONVERSATION_RETENTION_DAYS` (por defecto 90) y borrado por el cron de limpieza.
  - La página lista las conversaciones (fecha y primer mensaje), permite abrir una, **continuarla** y borrarla.
  - Lo que hoy era «Mis datos» (exportar, borrar cuenta, consentimientos) queda como sección «Privacidad y datos» dentro, o accesible desde ahí.
- **Iconos SVG propios**, coherentes, de trazo y en línea, accesibles: cultura (sello caribeño con palma), conversaciones (burbujas), privacidad (escudo), guardar (marcador), micrófono, teclado, altavoz, salir, idioma (globo).
  - Créalos como componentes SVG en `src/components/icons.tsx`, sin librerías de iconos pesadas.
- Actualiza `/privacidad`, `docs/ARY_SECURITY_AND_PRIVACY.md` y `docs/PRIVACY_COMPLIANCE_REVIEW.md`: ahora se guardan conversaciones con consentimiento; finalidad, retención y derechos.

## 6. Landing cultural (ES y EN)

**Rediseño** de `public/index.html` y `public/en/index.html` (puedes reestructurar el CSS y el JS de la landing) con un estilo **cultural dominicano y profesional**:

- tipografía elegante;
- paleta inspirada en el Caribe y la bandera, sin caer en lo chillón;
- texturas o patrones sutiles en SVG, como motivos taínos, olas u hojas, hechos a mano.

**Imágenes reales de lugares culturales dominicanos.** Por ejemplo:

- Zona Colonial / Catedral Primada;
- Altos de Chavón;
- Los Haitises;
- Bahía de Samaná / ballenas;
- carnaval de La Vega / diablos cojuelos;
- Basílica de Higüey o Pico Duarte.

Reglas para las imágenes:

- Obtenlas **solo de Wikimedia Commons** con licencia compatible: dominio público, CC0, CC BY o CC BY-SA. Comprueba la licencia en la página del archivo.
- Optimízalas a webp de unos 1600 px como máximo, en `public/assets/places/`.
- Atribución completa visible cuando la licencia lo exija (autor, licencia y enlace), con un pie de foto discreto. Crea también `docs/IMAGE_CREDITS.md` con la tabla de cada imagen.
- No uses imágenes con marcas de agua, personas identificables en primer plano ni fuentes dudosas.

**Iconos.** Sustituye las flechas `→` y `↗` por iconos SVG coherentes con los de la app.

**Sin «kiosco»** en el texto de la web pública: quita «Explorar Ary · kiosco y móvil» y cualquier mención visible a kiosco. El acceso del operador queda solo por URL directa.

**«Habla con Ary».**

- Bloque protagonista con Ary (`ary-presentar.webp`) y una **burbuja de diálogo** del tipo «¡Hola! ¿Hablamos de República Dominicana?».
- Al pulsar a Ary o la burbuja se va a `/experiencia`.
- Animación sutil, que respeta `prefers-reduced-motion`.
- El botón principal del hero también dice «Habla con Ary» / «Talk to Ary».

**Se conservan:**

- el formulario B2B y su envío;
- las secciones de contenido existentes (adaptadas al nuevo estilo);
- la presentación y la demo si siguen teniendo sentido;
- el selector EN/ES.

Simplifica lo que sobre.

**Brochure.** Aplica el mismo estilo de forma ligera, o enlaza desde la landing si no aporta.

**Rendimiento:**

- imágenes con `loading="lazy"`, `width`/`height` y `srcset` si procede;
- LCP razonable en móvil;
- no metas frameworks en la landing estática.

## 7. Pruebas y entrega

- **Vitest:**
  - intención general frente a cultura frente a direcciones;
  - QR solo en el kiosco;
  - consentimientos del correo al inicio (términos obligatorio, marketing opcional y desmarcado);
  - cupo sin verificar;
  - guardado, retención y borrado de conversaciones;
  - cifrado.
- **Playwright:**
  - pantalla de correo (ES y EN);
  - chat compacto sin cortes en todas las anchuras;
  - «Mis conversaciones» lista y continúa;
  - kiosco: «¿cómo llego a Altos de Chavón?» → QR en el chat;
  - landing nueva: «Habla con Ary» lleva a `/experiencia`, sin la palabra «kiosco» visible y con créditos de imágenes visibles.
- **Capturas** en `docs/screenshots/stage8/` a 390 y 1440 px de: landing ES y EN, pantalla de correo, chat, Mi cultura, Mis conversaciones y kiosco con QR.
- **Comprobaciones:** `lint`, `typecheck`, `test` y `build` deben pasar, o documenta el error exacto del sandbox. Hay **dos** configuraciones de Playwright: `playwright.config.ts` y `playwright.stage7.config.ts`. Si puedes, integra la de stage7 como proyecto de la principal sin conflicto de puertos.

## Restricciones

- No hagas commits, push ni despliegues. No envíes correos reales.
- No hagas llamadas reales a Gemini: tests siempre con proveedor simulado.
- No imprimas secretos.
- Ignora memorias de otros proyectos y la carpeta `outputs/`. Gemini está autorizado: no existe ninguna prohibición.
- No metas rodeos de sandbox en la configuración.
- El disco es limitado: no generes logs enormes.

Al terminar, imprime:

- archivos;
- migraciones;
- variables nuevas;
- los créditos de las imágenes;
- los comandos con su resultado;
- los bloqueos;
- los pasos exactos para activar el correo real.
