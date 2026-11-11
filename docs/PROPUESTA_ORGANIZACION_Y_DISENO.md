# Propuesta: sitio más organizado y más lindo

Estado: **solo propuesta, sin implementar.** Preparada el 10-11-2026 para revisarla con el propietario antes de hacer cambios. Se basa en el código actual y en las capturas de `docs/screenshots/stage8/` (390 px).

## El problema en una frase

El sitio tiene muchas páginas útiles, pero el visitante solo puede llegar a una: el chat. Mi cultura, Mis conversaciones, Recuperar conversación, Privacidad y Términos existen, pero están escondidos o solo aparecen cuando ya estás dentro del chat.

## Lo que se ve hoy

**Portada (`/`)**
- El único camino es «Habla con Ary», repetido tres veces. Además lleva un icono de «enlace externo» que confunde, porque parece que abre otra web.
- Quien ya habló con Ary no ve ninguna forma de volver: no hay «Mis conversaciones», «Mi cultura» ni «Recuperar».
- El pie casi no tiene enlaces: faltan Privacidad, Términos, idioma y contacto.
- La marca no coincide con la del chat: en la portada es el logo «ary la cotorra» y en el chat es el texto «ARY *la Cotorra*».

**Chat (`/experiencia`)**
- La barra de abajo ocupa tres filas: el micrófono arriba, el campo de texto en medio y el altavoz debajo. Debería ser una sola fila.
- En modo desarrollo, el botón del micrófono queda tapado por el indicador «N» de Next.js. En producción no pasa, pero estorba al revisar.
- Las fichas cortan el texto a mitad de palabra («observación y parti»).
- Si la IA falla, el visitante lee «Ahora mismo no puedo pensar bien» seguido de una ficha de ejemplo, y queda confuso.
- «Voz y privacidad» queda como una línea minúscula al fondo.

**Páginas que el visitante no debe ver (y está bien así)**
- `/kiosco` es la pantalla del aparato físico en el aeropuerto o el restaurante. Se activa con un enlace de un solo uso. **No debe aparecer en el menú público**; por eso no la encontraste. Para verlo tú hace falta un acceso de propietario (ver la sección «Para ti, el propietario»).
- `/admin` y `/partner` son para el personal y las empresas, con acceso por correo.

## Mapa propuesto

```
PÚBLICO (cualquiera)
  Inicio /                 → portada cultural
  Hablar con Ary /experiencia
  Lugares /cultura/<id>    → fichas públicas (hoy solo se ven dentro del chat)
  Para empresas /#empresas → formulario B2B
  Privacidad · Términos    → en el pie

MI ESPACIO (visitante con sesión o correo)
  Mis conversaciones /mis-conversaciones
  Mi cultura /mi-cultura
  Mis datos y privacidad /cuenta/privacidad
  Recuperar mi conversación /reingresar   (si no hay sesión)

DISPOSITIVO (oculto)
  /kiosco · /kiosco/activar · /q/<token>

PERSONAL (oculto, con acceso)
  /admin · /partner · /admin/entrar
```

## Cambios propuestos

### 1. Un encabezado y un pie iguales en todo el sitio (prioridad alta)
- **Encabezado común** en la portada, el chat y Mi espacio: logo, «Hablar con Ary», «Lugares», «Mi espacio ▾» e idioma ES/EN.
- **«Mi espacio ▾»** es un menú con Mis conversaciones, Mi cultura, Mis datos y, si no hay sesión, «Recuperar mi conversación».
- En móvil todo va en un solo menú hamburguesa, con los mismos apartados.
- **Pie común** con Privacidad, Términos, Para empresas, Créditos de imágenes, idioma y «Proyecto para la WRO».
- Un solo logo (el del loro) en todas partes.

### 2. Portada con dos caminos claros (prioridad alta)
- Botón principal «Habla con Ary», sin el icono de enlace externo.
- Botón secundario «Ya hablé con Ary → ver mis conversaciones». Va a `/mis-conversaciones` si hay sesión, o a `/reingresar` si no la hay.
- Los lugares de la portada (Catedral, Los Haitises, Altos de Chavón) enlazan a su ficha pública y a «Pregúntale a Ary sobre esto», que abre el chat con esa pregunta ya escrita.
- Reducir a dos las tres repeticiones de «Habla con Ary».

### 3. Página «Mi espacio» (prioridad media)
- Una portada personal sencilla (`/mi-espacio`, o reutilizando `/mi-cultura`) con tres tarjetas grandes con icono:
  - «Seguir conversando», con la última conversación;
  - «Mis lugares guardados»;
  - «Mis datos y privacidad».
- Así el visitante tiene un solo lugar al que volver.

### 4. Pulir el chat (prioridad alta, coincide con la etapa 8B)
- Barra inferior en **una sola fila**: micrófono, «Escríbele a Ary…», enviar y altavoz.
- Fichas compactas: título, dos líneas con «…» bien puesto, y los botones «Guardar» y «Ver ficha».
- Si la IA falla, un mensaje honesto y amable con Ary «sin conexión» y un botón «Reintentar», sin mezclarlo con una respuesta de ejemplo.
- «Voz y privacidad» pasa al menú «⋯» de arriba.

### 5. Coherencia visual (prioridad media)
- Los mismos botones, márgenes, tipografía y paleta crema/verde en todas las páginas, incluidas privacidad, términos y las de correo.
- Las ilustraciones de Ary según el momento: presentar, pensar, celebrar o sin conexión.
- Revisar el diseño a 360, 390, 768, 1280 y 1440 px.

### 6. Para ti, el propietario (prioridad baja)
- Una página oculta `/dev/mapa`, que **solo existe en local** (como `/dev/outbox`), con enlaces a todas las pantallas, incluidas el kiosco y el admin. Sirve para revisar sin buscar rutas.
- En producción no existe.

### 7. «Registra tu Ary» con número de serie (idea propuesta por el estudiante Sebastián, prioridad media)

**La idea:** cada Ary físico lleva un número de serie. El negocio que lo compra (aeropuerto, hotel, restaurante, museo…) entra en la web, escribe el serial y queda como dueño de ese Ary. Desde ahí puede configurarlo y ver cómo está.

**Qué hay hoy:** la tabla `kiosk_devices` ya guarda cada Ary, con organización, ubicación, estado, firmware y última conexión. Pero solo se activa con `npm run kiosk:enroll` desde la terminal del propietario, y no hay número de serie. El panel `/partner` ya permite a las empresas ver sus cosas.

**Cómo funcionaría:**
1. **En fábrica**, cada Ary recibe:
   - un **serial visible**, por ejemplo `ARY-2026-00042`, en una etiqueta;
   - un **código de activación secreto**, que va en una tarjeta dentro de la caja o en un QR.
   - El serial solo **no basta**: cualquiera que pase junto al Ary puede leerlo. La alternativa al código de la caja es que la pantalla del propio Ary muestre un código de 6 dígitos al registrarlo, como cuando se vincula una tele.
2. **Página pública «Registra tu Ary»** (`/registrar`):
   - Ary de bienvenida: «¡Hola! Vamos a conocernos.»
   - El dueño escribe el serial y el código, o escanea el QR.
   - Entra o crea la cuenta del negocio con su correo (enlace mágico, como el personal actual).
3. **Preguntas de bienvenida**, una por pantalla, con iconos y Ary acompañando:
   - **¿Para qué vas a usar a Ary?** Aeropuerto, hotel, restaurante, museo, escuela, evento u otro.
   - ¿Dónde estará? Nombre del lugar y ciudad.
   - ¿Qué idiomas hablan tus visitantes? ES, EN o automático.
   - ¿De qué quieres que hable más? Lugares, comida, música, historia, naturaleza.
   - ¿En qué horario estará activo, y con qué volumen?
   - Con las respuestas, Ary ajusta sus saludos y sugerencias. Todo se puede cambiar después.
4. **«Mi Ary»**, el panel del dueño, que amplía `/partner`:
   - estado (conectado o desconectado, última vez visto, versión);
   - configuración (idioma, temas, horario, volumen, saludo);
   - estadísticas agregadas (conversaciones por día, temas más pedidos), sin datos de visitantes;
   - acciones seguras: reiniciar, probar saludo, poner en pausa;
   - «Transferir o desvincular» este Ary.

**Orden del registro (acordado con el propietario, 10-11-2026):**
1. **Crear la cuenta** del negocio con correo y enlace mágico.
2. **Escribir el serial** y el **código de la caja**, o escanear el QR de la tarjeta.
3. **Confirmar en el propio Ary.** Su pantalla muestra «¿Vincular este Ary a *Hotel X*?» y el dueño toca «Sí» en el Ary. Esto demuestra que tiene el aparato delante.
4. **Preguntas de bienvenida**: para qué lo usas, dónde estará, idiomas, temas y horario.
5. **Foto opcional del Ary ya instalado** en su sitio, sin que haga falta salir en ella. Sirve para el panel «Mi Ary», para soporte técnico y, con permiso, para una galería de lugares con Ary.

**Por qué la foto no sirve como prueba de que el Ary es tuyo:**
- Cualquiera que pase junto a un Ary en un aeropuerto puede hacerse una foto con él. Prueba lo mismo que leer la etiqueta del serial.
- Si la foto lleva la cara de la persona, es un dato personal sensible: hay que pedir permiso, guardarla de forma segura, borrarla a tiempo y que alguien la revise a mano.
- El código de la caja más la confirmación en la pantalla del Ary es más seguro, más rápido y no pide la cara de nadie.

**Sobre «controlar» a Ary:** desde la web se cambian **ajustes**, no los motores en vivo. Las órdenes llegan a la Raspberry Pi como peticiones de una lista cerrada (saludar, pausar, reiniciar), igual que el canal de mantenimiento actual. Así nadie puede mover las alas desde internet de forma peligrosa.

**¿Pregunta antes o al registrar?** Sugerencia: preguntar «¿para qué lo usarás?» **al registrar**, porque ahí el dueño tiene el Ary delante y la respuesta configura el aparato. Si hay una página de venta o reserva, se puede preguntar también ahí, solo para orientar la venta, y luego se rellena sola en el registro.

**Pendiente de decidir:** formato del serial; código en la caja o código en la pantalla; si un negocio puede tener varios Ary (recomendado: sí); qué pasa si un Ary se vende o se pierde (desvincular y bloquear).

**Cambios técnicos (para el brief):**
- añadir `serial` y `claim_code_hash` a `kiosk_devices`, en una migración nueva;
- crear un script de fábrica que genere seriales y códigos;
- crear la ruta de reclamo con límites de intentos;
- crear las preguntas de bienvenida y guardar `use_case` y la configuración del dispositivo;
- ampliar el panel de partner con «Mi Ary».
- `kiosk:enroll` se mantiene para el propietario.

## Orden sugerido

1. Encabezado y pie comunes, y los dos caminos en la portada (puntos 1 y 2).
2. Pulido del chat (punto 4), junto con lo pendiente de la etapa 8B.
3. Mi espacio y coherencia visual (puntos 3 y 5).
4. El mapa para el propietario (punto 6).
5. «Registra tu Ary» con serial (punto 7). Es más grande y conviene hacerlo como etapa propia (etapa 9).

Lo mejor es hacerlo como **etapa 8C**, después o junto con la 8B, con un brief para Codex igual que en las etapas anteriores. Antes de empezar conviene hacer commit de la etapa 8, para no mezclar cambios.

## Preguntas para decidir

1. ¿«Mi espacio» como página propia o solo como menú desplegable?
2. ¿Quieres una sección «Lugares» pública con todas las fichas, o basta con los tres de la portada?
3. ¿Se mantiene el brochure (`brochure.html`) enlazado, o lo sustituye la sección «Para empresas»?
4. ¿Hacemos commit de la etapa 8 antes de empezar?
