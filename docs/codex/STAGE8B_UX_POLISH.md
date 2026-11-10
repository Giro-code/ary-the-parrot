# Codex — Etapa 8B: pulido UX/UI de las pantallas de cuenta y correo

Continúas tras la etapa 8 (`docs/codex/STAGE8_REDESIGN.md`) en `D:\Ary The Parrot`. Actúa como **diseñador/desarrollador UX/UI profesional**. Reutiliza los iconos SVG (`src/components/icons.tsx`), el estilo y la pantalla de correo inicial con Ary y el sobre que creaste en la etapa 8.

## Feedback del propietario sobre `/reingresar` (captura del 10-11-2026)

> «Se ve muy feo y el texto es muy técnico, eso de agregar versiones en el texto. Cambia la estructura, agrega los SVG de orientación, agrega a Ary aquí en la solicitud. Tiene mucho texto; cierta información debe estar en el aviso de privacidad, si quieren verlo que lo abran, pero reduce todo este texto, hazlo más visual. Además, la persona debe poder acceder al chat igualmente, y el enlace estará ahí para recuperar la conversación.»

Hoy `/reingresar` muestra:

- «ARY · CUENTA OPCIONAL»;
- el título «Guardar y recuperar Mi viaje»;
- tres párrafos técnicos (365 días, 15 minutos, una sola vez, correo de servicio…);
- una casilla con texto largo;
- el enlace «Finalidades y aviso de privacidad · 2026-11-07.v1»;
- dos botones.

## Qué hacer

### 1. `/reingresar` rediseñada

- **Composición:**
  - Ary a la izquierda en escritorio y arriba en móvil, saludando (`ary-presentar.webp`), con una burbuja de diálogo corta.
  - Junto a Ary, el SVG del sobre.
- **Título humano**, por ejemplo: «¿Ya hablaste con Ary? Recupera tu conversación» / «Already talked to Ary? Pick up where you left off».
- **Una sola línea de apoyo:** «Te enviamos un enlace a tu correo para volver a tus conversaciones y viajes.»
- **Orientación visual.** Tres pasos con iconos SVG pequeños, sin párrafos: (1) escribe tu correo → (2) abre el enlace → (3) sigue la conversación.
- **Formulario:** campo de correo grande y claro, y una casilla breve: «Acepto el aviso de privacidad». El enlace abre el aviso en un panel o diálogo accesible, o en su página.
- **Texto técnico fuera de la pantalla.** Los 365 días, los 15 minutos, el uso único y las finalidades van al **aviso de privacidad** y a la página `/privacidad`, no aquí.
- **Versiones.** **Nunca** mostrar números de versión (`2026-11-07.v1`) al usuario. La versión se sigue guardando internamente en `consent_records`.
- **Botones:**
  - principal «Enviarme el enlace»;
  - secundario visible **«Ir al chat con Ary»**, que lleva a `/experiencia`. El visitante puede hablar con Ary igualmente sin esperar el correo, y el enlace del correo servirá para recuperar la conversación después.
- **Tras enviar**, estado de éxito visual: Ary celebrando (`ary-celebrar.webp`) más «¡Listo! Revisa tu correo» y un botón «Ir al chat mientras tanto».
  - En modo prueba (dry-run), el texto lo dice con honestidad y brevedad, sin tecnicismos: «Modo prueba: el correo no se envía todavía».

### 2. Mismos criterios en el resto de pantallas de cuenta y correo

Aplícalos a la pantalla de correo inicial de la etapa 8, `/auth/verify`, `/email/confirm`, `/email/baja`, `/cuenta/*` («Mis conversaciones», «Privacidad y datos») y a los mensajes de error y caducidad del enlace:

- textos cortos y cálidos;
- Ary con la ilustración adecuada (presentar, celebrar o pensar; sin conexión para errores de red);
- iconos SVG de orientación;
- nada de jerga ni versiones;
- detalles legales tras un enlace al aviso.

### 3. Aviso de privacidad

Reúne en `/privacidad` (ES/EN), bien organizado con encabezados e iconos, todo lo que se quitó:

- retención;
- caducidad y uso único del enlace;
- tipos de correo (servicio, promociones con doble confirmación);
- conversación y voz;
- proveedores (Google IA, Resend, Neon, Vercel);
- derechos y cómo ejercerlos.

La versión del aviso puede figurar **solo** al pie de esa página, como «Última actualización: 7 de noviembre de 2026».

### 4. Consistencia

- Mismos márgenes, tipografía, botones y paleta que la nueva landing cultural y el chat compacto.
- Móvil primero, de 360 a 430 px sin cortes. También a 1280–1920 px.

## Pruebas y entrega

- Actualiza los E2E afectados: textos, roles y nombres de botones. Incluye uno que compruebe que **no** aparece ningún patrón `\d{4}-\d{2}-\d{2}\.v\d` en `/reingresar` ni en la pantalla de correo.
- Capturas en `docs/screenshots/stage8b/` a 390 y 1440 px, en ES y EN.
- `lint`, `typecheck`, `test` y `build` deben pasar, o documenta el error exacto del sandbox.

## Restricciones

Las mismas de la etapa 8:

- sin commits, push, despliegues ni correos reales;
- sin llamadas reales a Gemini;
- no imprimir secretos;
- ignorar `outputs/` y las memorias de otros proyectos;
- no traducir código al traducir textos.

Al terminar, imprime los archivos y los resultados.

## Añadido del propietario (10-11-2026, tarde)

- **Pantalla tras enviar el correo:**
  - **Toda la pantalla** cambia a un estado de éxito, no un aviso pequeño bajo el formulario.
  - Ary **feliz y celebrando** (`ary-celebrar.webp`), grande y centrado.
  - Texto: «¡Te enviamos el correo! Revisa también tu bandeja de **spam**» / «We sent you an email! Check your spam folder too».
  - **Tras unos segundos (≈4 s), continúa solo al chat** (`/experiencia`), con una cuenta atrás o barra visible y un botón «Ir ya al chat».
  - Respeta `prefers-reduced-motion`. El aviso «Modo prueba» solo aparece en dry-run.
  - Quita el texto técnico actual «Solicitud registrada. Si procede, el correo queda en cola; la entrega no está confirmada».
- **Al llegar al chat**, la conversación anterior del visitante (si existe) se muestra automáticamente, sin que tenga que buscarla.
- **Chat.** El propietario vuelve a ver en producción el escenario grande de Ary, «Idioma: ES · música», chips y barra que tapan media pantalla. Eso es lo que corrige la etapa 8. **Verifica explícitamente** que en la versión final:
  - el escenario de Ary es una franja pequeña;
  - no hay ninguna etiqueta «Idioma: …» ni de intereses;
  - la barra de entrada (texto + micrófono + altavoz) es **una sola fila compacta**, con micrófono, campo «Escríbele a Ary…» y enviar, sin icono de teclado separado si el campo ya está visible;
  - los textos legales y «Ver mis guardados» / «Finalizar mi sesión» quedan en un menú o línea mínima;
  - las tarjetas de fichas son compactas, sin texto cortado a la mitad.

  Compruébalo con capturas a 390, 768 y 1440 px.
