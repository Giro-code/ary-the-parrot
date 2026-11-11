# PROMPT MAESTRO DE IMPLEMENTACIÓN — ARY LA COTORRA

> **Instrucción para Claude Code / OpenAI Codex**: Este documento es una orden de ejecución de ingeniería sobre **el repositorio existente**, no una solicitud de hacer únicamente una propuesta o mockup. Inspecciona el proyecto, diseña lo mínimo imprescindible, implementa cambios reales, prueba, documenta y deja las funcionalidades lo más operativas posible en una sola sesión. No inventes que algo funciona cuando no está conectado. No sustituyas componentes existentes sanos ni destruyas datos. **Prioriza un vertical slice completamente probado** antes que decenas de pantallas decorativas.

## 0. Contexto y misión del producto

El producto se llama **ARY — La Cotorra**, evolución del robot educativo **El Historiador Don Rafael** del equipo Mecánicos Express para WRO Future Innovators / Robots Meet Culture. Ary es una embajadora digital del patrimonio cultural dominicano para aeropuertos, hoteles, museos y centros de visitantes. La base verificada es un sitio estático de cinco archivos (dos HTML, dos PNG y un LEEME), sin backend ni framework npm, y el usuario ya dispone de un dominio en Vercel; **no presupongas la URL, el framework, el proveedor de BD ni los secretos: descúbrelos en el repositorio y el entorno autorizado**.

Queremos que un visitante pueda conocer a Ary en un kiosco físico (Raspberry Pi conectada a Arduino/ESP32 si existe), conversar sobre República Dominicana, elegir su país/idioma e intereses, descubrir experiencias culturales, y **escanear un QR para continuar la conversación y el recorrido desde su teléfono**. La sesión debe sobrevivir al cambio de dispositivo y conservar el progreso de forma controlada, con posibilidad de que el visitante **opcionalmente** facilite su correo para recuperar el enlace, recibir recomendaciones pertinentes y recordatorios consentidos. Operadores de servicios (turismo, excursiones, museos, tiendas o aeropuerto) deben recibir **datos útiles y autorizados**, no una copia indiscriminada de conversaciones ni identidades de pasajeros. La app debe tener un panel de gestión, contenidos verificables, informes y trazabilidad. El sitio corporativo preexistente, con sus seis vistas y brochure, debe seguir funcionando y mantener su identidad visual.

**Principio de producto:** el turista mantiene el control de su información. El hecho de escanear QR, solicitar orientación o aceptar la política de privacidad NO constituye consentimiento para marketing, seguimiento comercial ni cesión identificable a terceros. Cada fin requiere su propia base jurídica y, cuando corresponda, consentimiento granular y revocable. No se puede activar por defecto el marketing ni el intercambio de datos personales con proveedores. Implementa la alternativa de analítica agregada y anonimizada por defecto.

## 0A. INVENTARIO VERIFICADO DEL ZIP ENTREGADO — ESPECIFICACIÓN VINCULANTE

**Fuente de verdad auditada:** archivo `Ary-la-Cotorra-web.zip` entregado por el usuario. El agente debe tratar sus archivos como **la implementación original que hay que conservar**, NO como una referencia lejana ni una excusa para crear una landing nueva. El ZIP abre correctamente (`zipfile.testzip()` sin errores) y contiene **exactamente cinco entradas**:

| Ruta en ZIP | Tamaño aprox. | Papel real |
|---|---:|---|
| `index.html` | 53,583 B | Landing completa: HTML, CSS embebido y JS sin dependencias; seis secciones con router mediante `location.hash`; botones y diálogos |
| `brochure.html` | 4,017,913 B | Folleto imprimible autosuficiente con imágenes embebidas; NO es un endpoint ni documento PDF preexistente |
| `assets/ary-la-cotorra.png` | 898,204 B | Imagen original del proyecto: conservarla |
| `assets/don-rafael-prototipo.png` | 2,109,600 B | Imagen original de Don Rafael: conservarla |
| `LEEME.txt` | 2,369 B | Descripción del funcionamiento, límites conocidos, referencias de diseño y pruebas que el autor dice haber realizado |

**No existen en esta base** `package.json`, `src/`, React, Next.js, TypeScript, `api/`, base de datos, endpoints, SDK de email, autenticación, logs de servidor, integración real de IA, QR real ni control físico del robot. **No afirmar que tales componentes ya están implementados**. Tampoco hay peticiones `fetch()` ni `localStorage` en el JS observado del sitio original. El formulario B2B **NO envía nada**: valida campos y construye un TXT descargable en el navegador. La demo cultural muestra **tres respuestas preestablecidas** (historia/cultura, gastronomía/mangú, naturaleza); NO llama a Gemini.

### Rutas y componentes existentes — se deben conservar

La navegación original usa secciones con `id` y hash (por ejemplo `/#inicio`). Mapa exacto:

- `#inicio` — inicio/hero, llamada a explorar.
- `#conoce` — cómo funciona Ary, hardware, IA, casos de uso con pestañas `aeropuerto`, `restaurante`, `cultural`; botón de demo.
- `#historia` — transición de Don Rafael a Ary; fotografía del prototipo.
- `#nosotros` — visión y equipo, sin identidades inventadas.
- `#brochure` — explicación y enlace a `brochure.html`.
- `#solicitar` — formulario de contacto comercial: `name`, `org`, `email`, `place`, `message`, resultado y botón «Descargar solicitud .txt».

`index.html` contiene `#demo-dialog` para demo guiada con tres intereses, y `#presentation-dialog` con tres diapositivas controladas por botones y flechas. La navegación móvil tiene botón de menú, etiquetas ARIA, foco y manejo de Escape. El router cambia `document.title` y conserva el estado de pestaña en la URL. Los filtros de escenarios actualizan contenido dinámico. Se usan ilustraciones SVG y fotografías proporcionadas. **Mantén estas seis vistas y sus capacidades, accesibilidad, textos explicativos y enlaces públicos.**

### Identidad visual y activos — NO REEMPLAZAR

- Título actual del sitio: `Ary la Cotorra · Descubre lo nuestro`.
- Paleta principal ya implementada en `:root` de `index.html`: `--paper: #f8f6ef`, `--white: #fffefa`, `--ink: #183e32`, `--green: #254e3b`, `--lime: #d7ee93`, `--coral: #e6a18a`, `--line: #d9ded0`. El folleto añade acentos morados. El lenguaje gráfico es crema, verde, violeta, rojo y cotorra dominicana.
- No reemplazar los PNG proporcionados por imágenes generadas o stock. Mantener rutas históricas o crear redirecciones verificadas.
- Mantener la versión imprimible del folleto; se puede optimizar el peso o reconstruirlo con recursos locales si el resultado en impresión es equivalente. No incrustar 4 MB de brochure en el JS de todas las vistas.
- Preservar `skip link`, navegación por teclado, diálogos, foco, `aria-selected`, soporte móvil y contraste.
- El `LEEME.txt` dice que se probaron anchos 390, 820, 1440 y 1920 px. Esto es **una afirmación del archivo original**, no una ejecución de pruebas durante esta tarea. Añade pruebas de regresión automatizadas y screenshots antes/después, y registra resultados propios.

### Distinción semántica vital

La web existente es **web institucional/de presentación B2B**, no el producto de experiencia de viajero. No borrar la primera. Construir **dos experiencias conectadas que coexistan**:

1. **Pública comercial existente:** landing con seis apartados, brochure, historia, casos de uso, solicitud de Ary.
2. **Aplicación turística y de hardware NUEVA:** kiosco, charla con Ary, Puente Cultural, QR, continuación móvil, perfil opcional, Mi cultura, mapas/contenidos, correos, CMS, proveedores, administración, robot.

Estas superficies **no deben mezclarse**. Un pasajero anónimo no verá el formulario «Solicitar tu Ary» como parte obligatoria de la experiencia, y un hotel interesado en instalar el robot no debe acabar creando un perfil turístico accidentalmente.

### Afirmaciones que deben conservarse como propuestas, no transformarse en “hechos”

El contenido actual menciona `Raspberry Pi 4`, **cuatro servomotores**, bocina, micrófono, sensor de detección, **Gemini** y **«un modelo entrenado»**. Son afirmaciones del sitio/brochure, pero el ZIP **no aporta código, pesos, telemetría ni evidencia del entrenamiento o del funcionamiento del hardware**. Mantenerlas como descripción documentada del equipo, y agregar etiquetas `Documentado por el equipo`, `Por validar`, `Conectado y probado` según corresponda. NO afirmar que el modelo está realmente entrenado, en ejecución o que la IA funciona en vivo hasta ver pruebas del modelo, credenciales autorizadas y respuestas reales.

Se menciona **Arajet solamente como posible oportunidad de colaboración**, no como socio, cliente, patrocinador ni aeropuerto instalado. Conservar la aclaración de ausencia de alianza confirmada. No añadir logos comerciales sin autorización.

## 0B. ESTRATEGIA DE MIGRACIÓN REAL DESDE HTML ESTÁTICO A PLATAFORMA VERCEL

**Situación de partida:** sitio puro `index.html` + `brochure.html` + dos PNG. No hay estructura npm preexistente, por tanto **NO** ejecutar supuestos comandos de Next.js o modificaciones de rutas App Router sin comprobarlo. Elegir una implementación sustentable y entregar el código en un proyecto desplegable en Vercel, cuidando la continuidad de diseño.

### Plan de migración permitido

1. Hacer copia de los cinco archivos originales en una carpeta de respaldo versionada o tag Git (por ejemplo, `legacy/` o commit `baseline-static-ary`), dejando claras las rutas preservadas. Conservar el ZIP original si está disponible, sin extraer rutas peligrosas; no ignorar assets al crear el nuevo proyecto.
2. Tomar capturas reales del sitio actual o crear tests DOM de la versión estática para medir regresiones. Describir exactamente qué funciona antes de cambiar nada.
3. **Opción preferida si el repositorio continúa siendo solo el ZIP**: migrar con cuidado a **Next.js App Router + TypeScript** para unificar páginas, endpoints, autenticación y formularios en Vercel; **pero** reaprovechar HTML, CSS, SVG, assets, textos y scripts adaptados a componentes, manteniendo el diseño visual pixel-conservativo y las URLs públicas. NO regenerar marketing desde un template. Si existe un proyecto Vercel real diferente del ZIP con stack ya establecido, primero inspeccionarlo y decidir la estrategia compatible sin reconstruir innecesariamente.
4. Alternativa justificable: mantener HTML/CSS/JS estáticos y añadir Vercel Functions en `/api`, router/SPA ligera, tipado y herramientas de build; preferir esta vía si se demuestra menor riesgo y mantenimiento comparable. Justificar la elección en `docs/ARY_MIGRATION_DECISION.md`. **No implementar ambas arquitecturas a la vez**.
5. Con Next.js, servir portada en `/`, añadir redirección o compatibilidad de hash (`/#inicio`, `/#conoce`, etc.), y proporcionar una ruta funcional a `brochure.html` (`/brochure.html` o redirección estable). Mantener páginas corporativas y añadir `/kiosco`, `/experiencia`, `/mi-cultura`, `/admin`, `/partner` y flujos `/q/...`. En cualquier migración, probar todos los enlaces y el uso de `window.location.hash`/`history` para no romper accesos directos.
6. Mover CSS/JS inline a archivos mantenibles **sin alterar el resultado visible**, separando lógica de pestañas, demo, presentación, lead form, routing y componentes de experiencia. Evitar añadir Tailwind/UI library por defecto si no aporta algo imprescindible. No duplicar código ni introducir dependencia de red para renderizar lo que actualmente funciona offline.
7. **No usar archivos locales como base de datos en producción Vercel**, porque el sistema de ficheros de funciones no es persistente. Si no hay base de datos configurada, implementar capa typed repository + migraciones para PostgreSQL administrado compatible, con opción de desarrollo/test local; escoger un proveedor cuando las credenciales reales y restricciones estén claras. No marcarlo como «almacenado en producción» sin persistencia verificada.
8. Distinguir **tres entornos**: desarrollo seguro con datos de prueba, preview de Vercel, producción con control de envíos y consentimiento. Nunca usar correo en producción como sandbox accidental ni publicar secretos.

### Migración específica del formulario actual: de TXT a contacto REAL

La sección `#solicitar` tiene estos campos existentes: `name`, `org`, `email`, `place`, `message` (el selector contempla aeropuerto/aerolínea, restaurante, hotel, espacio cultural/turístico y otros). Mantener nombre, organización, correo, tipo de establecimiento y mensaje, sus validaciones y visual actual. **Extender** para ofrecer:

- Envío verdadero al backend (`POST /api/commercial/inquiries`) validado en servidor, anti-bot, rate limiting, idempotencia, captcha no intrusivo solo si es necesario, consentimiento de tratamiento de la solicitud y política visible.
- Registro de solicitud B2B en base de datos **separada de perfiles de turistas** con `source`, `status`, `createdAt`, `leadType`, `locale`, `consentVersion` y auditoría. No asociarla automáticamente a campañas de marketing.
- Al confirmar guardado, mostrar número de referencia y estado REAL; entregar acuse transaccional por email solo si el proveedor y remitente están configurados. El equipo administrador recibe una notificación de nueva solicitud cuando se configure su correo, sin exposición a otros proveedores.
- Mantener el botón de **descargar `.txt`** como comodidad adicional, no como sustituto del envío. Si hay error, mostrar `No se pudo enviar`, permitir reintentar o descargar el TXT, y no decir `enviado`.
- Si todavía no se configuró la BD/email, crear adaptador y modo de prueba marcado, sin simular haber recibido el lead real.

### DEMO EXISTENTE: preservar y añadir una demo REAL separada

`#demo-dialog` ofrece respuestas predeterminadas `cultura`, `comida`, `naturaleza` y cambia un SVG. Mantener esta demostración como `demo guiada` apta para visitantes aun si el servidor no funciona; añadir una **experiencia en vivo claramente separada** accesible desde la landing. Si se migra la demo a IA real, conservar un modo determinista de respaldo y un indicador visible `Respuestas de ejemplo` frente a `IA en línea`. No romper los tres botones actuales, ni borrar las explicaciones de escenarios (`aeropuerto`, `restaurante`, `cultural`) ni las tres diapositivas existentes con teclado.

### BROCHURE: mantenimiento y rendimiento

`brochure.html` pesa ~4 MB por fotografías embebidas. Debe seguir siendo imprimible con estilos para papel y enlazar de regreso a la web. Si optimizas usando `/assets/`, comprueba que impresión/PDF y funcionamiento offline sean correctos. No agregar datos de perfil, tokens de QR o correos al brochure ni a recursos de indexación.

## 0C. PRIORIDADES DE PRODUCTO ESPECÍFICAS QUE FALTAN EN EL ZIP

**P0: historia de usuario íntegra**, no mockup:

- `/kiosco`: pantalla de bienvenida adaptada a pantalla táctil de Raspberry Pi, botón `Iniciar`, dos idiomas, opción de ignorar preguntas y estado explícito `offline`.
- Ary pregunta de forma **opcional** país de procedencia, idioma y actividades culturales favoritas. No infiere gustos por país ni usa reconocimiento facial/identificación.
- Experiencia de **Puente Cultural Inteligente**: pide país e intereses, consulta fichas culturales curatoriales, explica coincidencias/diferencias comprobadas y crea itinerario breve de contenido dominicano; debe poder explicar por qué recomienda cada tema.
- Conversación por texto como fallback seguro; voz si micro y TTS funcionan realmente y con permisos; separar client recording de server processing y no grabar por defecto conversaciones de audio para analítica.
- QR único, efímero, anticopia, confirmación en móvil y borrado de estado público del kiosco. En el teléfono se restaura la selección del visitante y una tarjeta cultural que puede abrir desde su teléfono.
- `/mi-cultura`: actividades sugeridas, guardados, destinos y contenidos favoritos, progreso y QR de fichas compartibles (distintos del QR secreto de handoff).
- **Cuenta opcional por correo verificado**: enviar enlace para volver al sitio desde otros dispositivos; correo de servicio solicitado ≠ consentimiento de marketing. Frecuencia, intereses, preferencias e interacciones retenidas solo en el alcance comunicado y aceptado.
- **Correos opt-in** con textos profesionales en español/inglés, baja de un clic y soporte para supresión ante rebote/queja. Incorporar calendario de recordatorios programados solo si el usuario lo activa y configura. "Mantener siempre conectado" significa continuidad voluntaria, nunca vigilancia permanente ni rastreo de ubicación escondido.
- **Analíticas agregadas e informes a quienes proveen el servicio**: mostrar al aeropuerto/operador temas solicitados, idioma general y conversiones de QR; NO vender ni ceder chats, correos o historial individual a todos los proveedores. Para enviar solicitud a proveedor particular, pedir autorización explícita para esos campos y ese receptor.
- `/admin`: gestionar destinos, documentos, relaciones culturales, idiomas, verificación, registros de consentimientos y estado de envíos. `/partner`: catálogo/ofertas aprobadas, métricas propias, leads aprobados, con tenant isolation.
- El dominio Vercel del usuario existe pero **su nombre NO viene en el ZIP**: recuperarlo del entorno o `vercel.json`/config del proyecto real y solo entonces usarlo para QR, remitente y deep links. No inventar URL, no codificar dominios de ejemplo en producción.

**Criterios específicos de éxito funcional**:

1. En demo E2E, usuario A inicia en kiosco en español, indica país e interés, recibe contenido curado, escanea QR y recupera exactamente sus selecciones en móvil B; el kiosco queda limpio.
2. El mismo código QR caduca y no puede ser usado por teléfono C; existe manejo UX de expiración.
3. Usuario B guarda experiencia y recupera el acceso por correo VERIFICADO sin permitir que otra persona se adueñe del perfil al conocer su dirección.
4. Sin autorización, un proveedor solo obtiene estadísticas agregadas; al compartir explícitamente un lead con proveedor P, solo P recibe campos anunciados.
5. Un turista que no da correo o rechaza marketing puede completar la experiencia y usar el QR igual.
6. Formulario corporativo `Solicitar tu Ary` envía y persiste un lead real cuando la BD está activa, conserva botón `.txt` y muestra error honesto al faltar backend/correo.
7. Sitio corporativo y brochure visualmente fieles en 390/820/1440/1920 px; se prueban teclado, menús, tabs, modal de presentación, demo cultural, enlaces y PDF/impresión.
8. Vercel Preview compila sin errores; si hay variables de entorno ausentes, el build sigue con modo de prueba identificado y endpoints sensibles dejan de funcionar con error seguro; el modo de producción no emite `200 success` ficticios.

## 0D. DECISIONES DE SEGURIDAD ESPECÍFICAS PARA AEROPUERTO Y VERCEL

- Nunca poner `RESEND_API_KEY`, `GEMINI_API_KEY`, credenciales del robot, tokens de proveedor, correos de admin ni secretos de firma en `index.html`, variables `NEXT_PUBLIC_*`, fuentes públicas o `brochure.html`. Se sabe que hubo un documento de un proyecto anterior con una clave expuesta: no copiarla, no usarla, no mostrarla en logs; pedir rotación si aparece en este repositorio.
- Vercel funciona como servicio HTTP/API y aplicación web; **NO** como puerto serial del robot ni servidor WebSocket persistente arbitrario. Control de servos/micrófono/sensores en servicio local de Raspberry Pi, conectado mediante requests salientes HTTPS o infraestructura de mensajes aprobada. Diseñar `RobotAdapter` y modo mock rotulado. La página web pública no puede activar motores sin verificar la autenticación del dispositivo y sin límites de seguridad físicos.
- Para mostrar `Sistema disponible`, estado de robot o IA, obtener salud real. Si desconectado, mostrarlo, no inventar badges online.
- Los datos de turistas son potencialmente personales y requieren minimización. Analítica agregada y con controles de tamaño mínimo de grupo; sin geolocalización continua, cookies comerciales por defecto ni perfilado sensible. En aeropuerto, preferir preguntas voluntarias por pantalla y pantallas que se limpien al terminar.
- Evitar que un robot dé información peligrosa o equivocada sobre migración, puertas de embarque o emergencias. Estas respuestas deben provenir de datos oficiales en tiempo real o dirigir al personal del aeropuerto. El contenido patrimonial debe citar origen, fecha y editor.
- Los registros de la experiencia y las relaciones culturales deben poder exportarse/eliminarse desde un panel de privacidad real, conforme a políticas aplicables; la aceptación de marketing debe ser separada de la de conservar preferencias.
- Diferenciar capacidad implementada, funcionalidad demo, datos de ejemplo, propuesta comercial y resultado probado en todos los materiales WRO, dashboard, folleto y web.

## 0E. ORDEN DE IMPLEMENTACIÓN OPTIMIZADO PARA ESTA BASE

**Iteración 1 — preservar baseline y estructurar**
- Identificar repositorio efectivo. Guardar versión de respaldo y snapshots de las seis secciones, presentación, demo y brochure. Configurar stack, tests mínimos y despliegue de preview; dejar las páginas originales funcionando.
- Extraer componentes/estilos con conservación del diseño, crear rutas corporativas y nuevas rutas de aplicación; no empezar con panel admin antes de tener al menos un flujo visitante funcional.

**Iteración 2 — núcleo del producto en Vercel**
- DB/migraciones, sesión anónima, contenido cultural semilla con fuentes, país/idioma/intereses, recomendador verificable; persistencia real, tests de consultas y aislamiento de acceso.
- Kiosco y `/experiencia` móvil, QR seguro, canje único, renovación, pantalla de confidencialidad, progreso, favoritos y vuelta a espera del kiosco.

**Iteración 3 — recuperación y contacto real**
- Email provider adaptado, enlaces mágicos, consentimiento por propósito, tabla de email outbox, suscripciones y bajas, plantillas `es/en`. Implementar `Solicitud de Ary` corporativa real con archivo TXT preservado. Configuración separada para contactos empresariales vs turistas.

**Iteración 4 — servicios, analíticas y WRO**
- CMS admin, roles, organizaciones, partner dashboard, solicitudes autorizadas y analítica agregada, robot adapter y simulación honesta, scripts demo y tests Playwright. Pulir distribución Raspberry en kiosco y métricas.

**Si falta infraestructura y no se puede provisionar legítimamente**: dejar migraciones, API adapters, servicios mock identificados y pruebas, e indicar **pasos exactos y dependencias** para habilitar cada función. Nunca crear una ilusión de persistencia, envío real o conexión física. Priorizar de forma estable el vertical slice P0 antes de muchas vistas inertes.

### Documentos adicionales que se exigen para entregar el proyecto

- `docs/BASE_AUDIT.md`: comparación exacta de los cinco archivos originales y su funcionalidad antes de cambios.
- `docs/ARY_MIGRATION_DECISION.md`: arquitectura elegida con justificación, enlaces legacy preservados y estrategia brochure.
- `docs/LEGACY_REGRESSION.md`: lista de elementos de `index.html` que han sido preservados, capturas comparativas, diferencias aceptadas.
- `docs/FEATURE_MATRIX.md`: estado `ORIGINAL`, `REAL_IMPLEMENTED`, `SANDBOX_ONLY`, `BLOCKED`, `NOT_DONE`, por cada función.
- `docs/DEPLOY_VERCEL_AND_PI.md`: dos despliegues distintos (web nube y hardware local), variables secretas, healthcheck y pasos reproducibles.


## 1. Modo de trabajo obligatorio para el agente

1. Empieza por inventariar los cinco archivos del ZIP y revisar `LEEME.txt` e `index.html` (incluido JS inline); después examina cualquier estructura adicional del repositorio real (`README`, `package.json` si existe, rutas, BD, esquema, migraciones, variables de entorno, componentes UI, autenticación, endpoints, despliegue y tests). Si hay configuración de Vercel, respétala. Detecta la rama Git, estado limpio/sucio y archivos modificados. **No borres ni sobrescribas trabajo no confirmado del usuario**.
2. Si hay agentes, scripts o instrucciones locales (`AGENTS.md`, `CLAUDE.md`, etc.), léelos. Verifica versiones reales de Next.js/React, SDK IA, proveedor email y librerías consultando docs aplicables; no pegues ejemplos obsoletos de memoria.
3. Escribe un resumen corto del estado actual y un plan de ejecución en `docs/ARY_IMPLEMENTATION_PLAN.md`, con inventario `EXISTS / PARTIAL / MISSING / BLOCKED`. **Empieza a implementar de inmediato** sin esperar confirmación para cambios locales reversibles. Solo detente ante operaciones destructivas, gastos, envío de correos a usuarios reales, publicación de datos o producción sin permisos, y documenta el bloqueo.
4. Conserva la base visual estática y sigue la decisión de migración en 0B; si falta BD, propone e implementa un adaptador para una opción compatible con Vercel (preferencia: PostgreSQL administrado, p. ej. Supabase/Neon, o Firestore si ya existe); evita migraciones innecesarias. Si existe un stack de otro tipo, adáptate.
5. Construye cambios en incrementos funcionales con tests. Ejecuta `lint`, `typecheck`, pruebas y build; corrige errores de tus cambios. No elimines tests para hacerlos pasar.
6. Usa secretos exclusivamente desde servidor/entorno seguro; `.env.example` tendrá placeholders, nunca secretos reales. Si encuentras claves incrustadas en el código/documentación, no las imprimas ni las subas, identifica el riesgo y documenta la rotación necesaria.
7. Prioriza accesibilidad, UI responsiva, inglés y español al menos, estados de carga/error/vacío y resiliencia sin internet en el kiosco. Documenta qué funciona de verdad y qué depende de servicios externos/configuración.
8. Al final entrega: resumen de archivos modificados, migraciones, variables necesarias, manual de configuración Vercel, pruebas ejecutadas, flujo end-to-end probado, lista de bloqueos y demo reproducible. No afirmes haber enviado correos, creado recursos o desplegado si no lo verificaste.

## 2. Objetivo principal — experiencia de principio a fin

**Flujo A — visitante anónimo en el kiosco**

1. Ary está en estado de reposo. La web pública del kiosco ofrece idiomas, accesibilidad y botón claro para comenzar; evento de proximidad si hardware está disponible.
2. Pregunta de manera opcional: «¿De qué país nos visitas?» y «¿Qué te gusta conocer: historia, música, gastronomía, naturaleza, arte, aventura…?»; permite omitir. Nunca deduzcas gustos, etnia, religión, riqueza o intereses exclusivamente a partir de nacionalidad.
3. La IA propone una conversación guiada y recomendaciones justificadas, sustentadas en datos culturales verificados. Aparece título, texto, fuente, imágenes autorizadas y preguntas sugeridas; la voz se reproduce si está disponible.
4. El kiosco muestra **“Continúa tu experiencia en tu teléfono”**, un QR dinámico **por sesión** que enlaza con el dominio real de Ary (base URL por variable `APP_BASE_URL`). Junto al QR: expiración, aviso breve de privacidad y opción de reiniciar sin continuar.
5. El QR no debe contener correo, ID personal, conversación, secretos API, ni un token de sesión permanente en texto claro. Debe apuntar a una **ruta de canje** con token aleatorio criptográficamente seguro, de vida corta, un solo uso o vinculado a un canje seguro, almacenado únicamente como hash en BD. Implementa protección contra reutilización, replay, adivinación y fuerza bruta. Revisa riesgos de QR fotografiado por terceros: confirmación en kiosco, caducidad corta y/o autorización explícita del usuario antes de vincular datos, cuando sea viable.
6. En el teléfono, la persona ve una página responsive explicando qué podrá recuperar y debe pulsar **“Continuar mi experiencia”** para vincularla. La aplicación establece una sesión segura HTTP-only `Secure` `SameSite` y CSRF-safe, sin guardar el secreto en `localStorage`. El token del QR se consume en servidor y desaparece de la URL mediante redirección.
7. Se restaura idioma, preferencias y elementos guardados. Para historial de chat, permitir al usuario elegir si guardarlo y qué conservar. Si no hay consentimiento, guardar lo mínimo temporal para operar y eliminarlo según retención. El visitante puede seguir sin correo ni crear cuenta.
8. El kiosco detecta la transferencia y **se limpia**: no debe quedar información de la persona anterior. Mantén una sesión de dispositivo separada del perfil móvil y aplica expiración por inactividad.

**Flujo B — recuperar viaje / correo**

1. En teléfono o al canjear QR, mostrar CTA separado: «Guardar mi experiencia y recibir un enlace por correo».
2. Solicitar email, informar propósito, conservación y frecuencia; **consentimiento específico para mensajes de servicio** (enlace de acceso/recuperación) y un checkbox distinto, desmarcado, para **recomendaciones y recordatorios de marketing**, si los desean.
3. Validar correo, normalizar razonablemente sin sobre-normalizar, proteger de enumeración. Usar **verificación por email / magic link** con token fuerte, hash en BD, vida corta, uso único y rate limit. Verificar que quien se vincula controla el correo antes de considerarlo propietario del perfil.
4. Enviar email transaccional verificable con enlace seguro para volver a Ary. Si el visitante elige recibir sugerencias, implementar double opt-in para marketing y un enlace de baja funcional en cada correo promocional, con supresión inmediata.
5. La experiencia puede recuperarse en otro dispositivo mediante enlace mágico y una sesión autenticada; evitar que los enlaces de mensajes incluyan todos los datos del usuario o permisos del proveedor.
6. Cuando el proveedor de email no tenga API keys o dominio verificado, construir integración real detrás de adaptador, modo desarrollo `dry-run`/sandbox y diagnóstico claro. Nunca simular envíos reales como exitosos. No enviar correos masivos a direcciones reales sin autorización.

**Flujo C — recomendaciones durante el viaje**

1. El usuario guarda lugares, rutas, historias o experiencias culturales en **“Mi cultura con Ary”** y marca realizados, pendientes o favoritos.
2. La IA explica **por qué** recomienda algo (intereses expresados, tiempo disponible, ubicación **solo si el usuario la comparte**, horarios y datos verificados), muestra fuente y fecha de actualización.
3. Los servicios externos pueden presentar ofertas o actividades aprobadas; siempre etiqueta `Patrocinado` y no alteres información factual por patrocinio. Prioriza pertinencia, accesibilidad y confiabilidad.
4. Permite recordatorios configurables por usuario: ninguna notificación por defecto, frecuencia (por ejemplo semanal/antes de experiencia), zona horaria elegida o capturada con permiso y pausa/baja inmediata.
5. La personalización se actualiza conforme el usuario indica intereses; registra preferencias explicitadas, no perfiles sensibles inferidos. Distinguir país de origen, idioma de preferencia, país de residencia y ubicación actual; ninguno es obligatorio.
6. Si un destino cambia o la información no puede verificarse, mostrar incertidumbre; no inventar horarios, precios, requisitos migratorios ni itinerarios.

**Flujo D — operadores y proveedores**

1. Usuario administrativo autenticado, con RBAC y pertenencia a una organización/tenant.
2. Operador del aeropuerto ve métricas **agregadas**: sesiones, QR generados/canjeados, temas consultados, idiomas, experiencias guardadas, conversiones voluntarias y satisfacción. Para segmentos pequeños aplica supresión por umbral (ej. `<10`) o reglas de privacidad apropiadas. No exponer mensajes privados por defecto.
3. Proveedor turístico autenticado ve **solo** sus ofertas, clics, reservas/solicitudes recibidas y estadísticas agregadas relacionadas con su servicio, con IDs de organización segregados a nivel de BD/API.
4. Si el usuario elige expresamente **“Enviar mis datos y mi solicitud a [proveedor concreto]”**, mostrar qué campos compartirá y registrar consentimiento versionado. Proporcionar al proveedor únicamente esos campos y la solicitud correspondiente; jamás exportar el historial completo de chat por rutina.
5. Si se integran formularios de contacto/reserva, confirmar al visitante qué empresa lo recibirá, finalidad y método de contacto; registrar auditoría.
6. Incluir opción de **revocar permisos de compartición, desconectar proveedor y solicitar supresión**; hacer efectiva la revocación para futuros accesos e informar limitaciones legítimas sobre datos ya transmitidos.

## 3. Dominios y superficies de la aplicación

Diseñar rutas teniendo en cuenta que el router **verificado** de la landing original usa hashes `#inicio`, `#conoce`, `#historia`, `#nosotros`, `#brochure`, `#solicitar`; no romperlas. Las siguientes rutas son **nuevas** o sugeridas, no preexistentes:

- `/`: conservar exactamente la landing pública original (seis secciones con hash), añadiendo entrada visible a la nueva experiencia en kiosco y móvil sin reemplazar la web corporativa.
- `/kiosk`: interfaz pantalla grande, estado idle/welcome/conversation/QR/transfer.
- `/q/[code]` o `/connect/[code]`: punto de **canje de QR** con acción confirmatoria POST, no sesión indiscriminada por GET.
- `/experiencia`: móvil, chat cultural, contenidos, destinos, favoritos, progreso.
- `/mi-cultura`: guardados, preferencias, recordatorios, exportación o eliminación.
- `/reingresar`: solicitud de enlace mágico de recuperación, estados antifiltración.
- `/auth/verify`: consumición segura de magic link.
- `/cuenta/privacidad`: consentimientos, datos guardados, descargar/eliminar.
- `/admin`: dashboard global RBAC.
- `/admin/contenidos`: CMS de destinos/arte/historia/validaciones.
- `/admin/organizaciones`: tenants, membresías, roles y límites.
- `/admin/campanas`: campañas opt-in con vista previa y auditoría.
- `/partner`: dashboard de proveedores con alcance limitado.
- `/partner/ofertas`: ofertas y servicios propios, estado de aprobación.
- `/api/health`: verificación segura de salud, sin datos secretos.
- `/api/robot/*`: interfaz verificada y autorizada para eventos del kiosco/control del robot, según infraestructura.

UX: branding dominicano sin clichés, iconografía coherente, diseño profesional premium, botones táctiles grandes, tipografía legible, contraste AA, teclado, lectores de pantalla, estados de bajo ancho de banda, touch targets, animaciones discretas y desactivables. No incluir datos de viaje reales en páginas de indexación; páginas privadas `noindex`; usar traducciones centralizadas y no traducir nombres propios arbitrariamente. Optimizar fotos, caching y carga de la Raspberry Pi.

## 4. Modelo de datos — implementar y versionar migraciones

Adapta nombres a convenciones existentes; esquema conceptual mínimo:

- `organizations`: id, name, kind (`airport`, `tour_provider`, `museum`, `hotel`, `admin`), status, createdAt.
- `memberships`: userId, organizationId, role (`superadmin`, `operator`, `provider_admin`, `provider_editor`, `analyst`), status.
- `kiosk_devices`: id, organizationId, locationLabel, publicDeviceId, keyHash/credential reference, firmwareVersion, status, lastSeenAt. Credential server-side rotatable, no secreto expuesto en browser público.
- `visitor_sessions`: id (opaque), kioskDeviceId nullable, locale, countryDeclared optional, interests JSON normalized, status, createdAt, expiresAt, lastActiveAt, ownerUserId nullable, retentionClass; avoid storing raw IP where unnecessary.
- `qr_handoffs`: id, sourceSessionId, tokenHash, expiresAt, usedAt, invalidatedAt, consumedBySessionId, createdAt, attemptCount, status.
- `visitor_accounts`: id, emailEncrypted/emailLookupHash or secure identity-provider reference, emailVerifiedAt, createdAt, deletionRequestedAt. Avoid creating duplicates; no automatic account via email string alone.
- `auth_magic_links`: tokenHash, userId nullable, purpose, expiresAt, usedAt, request metadata minimal.
- `consent_records`: id, visitorId/sessionId, purpose, granted, noticeVersion, collectedAt, revokedAt, source, proof, locale. Separate purposes `service_storage`, `transactional_recovery`, `marketing_email`, `provider_share`, optional `analytics_optional`.
- `visitor_preferences`: visitorId/sessionId, locale, countryDeclared optional, interests, desiredTripDuration optional, accessibilityPreferences optional with minimized retention, updatedAt.
- `cultural_items`: id, type, title, summary, validatedDescription, tags, language, country/region, location optional, imageAsset, sourceUrl, license, sourceCheckedAt, publishedAt, lastReviewedAt, status.
- `providers` / `offers`: organization ownership, services, eligibility, approvedStatus, categories, pricing/disclaimer, source verification date, affiliate/sponsored flag.
- `recommendations`: id, sessionId/userId, culturalItemId/offerId, rationale, evidenceIds, status, createdAt; avoid sensitive inferred traits.
- `saved_experiences`: owner, itemId, state (`saved`, `visited`, `removed`), notes optional, createdAt.
- `chat_messages`: owner/session, role, text or encrypted payload, provenance, retentionUntil; **only retain beyond short operational windows with explicit consent**, per-data TTL.
- `analytics_events`: event id, timestamp, org scope, session pseudonymous id or aggregation key, eventType, cultural item/provider id, minimal metadata allowlist; no raw prompt, email, full IP, secret or passcode.
- `provider_leads`: id, providerId, visitorId, userAuthorizedFields, purpose, consentRecordId, status, createdAt, expiresAt, audit reference.
- `email_subscriptions`: visitorId, addressRef, purpose, doubleOptInAt, status, frequency, locale, timezone, lastSentAt, unsubscribeTokenHash.
- `email_outbox`: id, template, recipient ref, idempotencyKey, scheduledAt, sentAt, providerMessageId, deliveryState, retries, lastError (sanitized), campaignId optional.
- `audit_logs`: actor, action, targetType/id, orgId, timestamp, safe metadata, no secrets.
- `deletion_jobs`: subjectId, requestedAt, status, completedAt, externalProcessorsNotifiedAt.

**Integridad y seguridad de datos**: constraints únicas, FK, indexes por sesión/organización/expiración, transacciones al canjear QR, delete cascades con política explícita, migrations reversibles, RLS donde el proveedor lo permita (Supabase) y autorización servidor sin fiarse solo de RLS. Paginación en consultas, políticas de retención y limpieza con trabajos programados, backup/restore probado cuando disponible. IDs aleatorios no secuenciales para acceso público.

## 5. Contratos API que deben funcionar

Diseñar endpoints tipados y validados con Zod/validadores existentes (adaptar según framework):

- `POST /api/visitor/session`: nueva sesión anónima mínima, devuelve estado y cookie segura.
- `PATCH /api/visitor/preferences`: país declarado, intereses, idioma; autorización de sesión y validación.
- `POST /api/visitor/handoff`: genera QR de vida corta desde kiosco autorizado y sesión vigente; token opaco, URL derivada del dominio configurado.
- `POST /api/visitor/handoff/redeem`: canje transaccional del código, confirma transferencia, rota sesión y borra datos del kiosco.
- `POST /api/visitor/handoff/cancel`: invalida QR.
- `GET /api/visitor/me`: devuelve solo datos autorizados del visitante.
- `POST /api/auth/request-link`: inicia recuperación sin revelar si correo existe; rate limit por email/IP de forma minimizada.
- `POST /api/auth/verify-link`: consume token de forma atómica, crea sesión segura y redirige limpiando URL.
- `POST /api/consents`, `GET /api/consents`, `DELETE /api/consents/:purpose`: consentimiento granular versionado y revocación.
- `GET /api/cultural/items`, `GET /api/cultural/items/:id`: listado y ficha aprobada, con fuente.
- `POST /api/recommendations`: recomendaciones estructuradas con explicación y referencias.
- `POST /api/chat`: conversación cultural con streaming si stack compatible; sanitización, límites y restricciones.
- `GET/POST /api/saved`: favoritos y progreso autenticados por propietario.
- `GET /api/analytics/overview`: métricas agregadas para operador; filtradas por tenant.
- `GET /api/partner/insights`: métricas agregadas del proveedor autenticado.
- `POST /api/partner/lead-request`: solicitud del visitante a proveedor concreto con consentimiento específico.
- `POST /api/email/preferences`: opt-in/out con verificaciones.
- `POST /api/privacy/export`, `POST /api/privacy/delete`: solicitud de exportación y borrado con autenticación robusta.
- `POST /api/internal/email-dispatch`: tarea protegida por credencial/cron signature y autorización de servidor; nunca pública sin autenticación.
- `POST /api/robot/events`: autenticación fuerte del dispositivo, verificación de formato, deduplicación.

Se aceptan convenciones de Server Actions si son equivalentes y seguras. No dejar endpoints `TODO` con `200 OK` falso. Responder errores estructurados, límites de peticiones, idempotencia en operaciones críticas, seguridad CORS/CSRF y pruebas de autorización cruzada. Para SSR, proteger cookies; para JWT, usar expiración, audiencia y rotación apropiadas.

## 6. IA y motor cultural — no generar una app genérica de chatbot

- Construir **pipeline de respuesta fundamentada**: intención -> consulta de contenido cultural verificado -> generación con referencias -> validación / guardrails -> texto y propuesta visual; no inventar fuentes ni afirmar certeza sin evidencia.
- Usar proveedor IA ya configurado; si no existe, permitir adapter para AI SDK / Vercel AI Gateway u otro compatible, consultando la versión instalada y docs. Nunca insertar secretos en cliente. Controlar costos por petición, límites por usuario y reservas de presupuesto.
- Modelo de perfil voluntario y no sensible: país declarado, idioma elegido, intereses expresados, actividad guardada; el país es contexto cultural, no sustituto de preferencias individuales.
- Recomendar actividades por intereses, horario/fuentes disponibles y restricciones dadas voluntariamente; transparencia “Te recomendamos esto porque seleccionaste…”.
- Soportar inglés/español end-to-end; otras lenguas mediante configuración y pruebas de calidad; fallback a idioma seleccionado.
- Responder sobre datos aeroportuarios solo con fuentes oficiales y actualizadas; para emergencia, migración, seguridad, vuelos y puertas no inventar ni actuar como autoridad. Derivar al personal y sitio oficiales.
- Los datos suministrados por proveedores y usuarios son **no confiables**: defensa contra prompt injection, salida estructurada validada, tools con scopes mínimos, URL allowlist y render seguro contra XSS.
- No alimentar marketing con transcripciones completas ni perfiles sensibles; procesamiento estadístico minimizado.
- Guardar `model`, token usage y errores técnicos sanitizados, no volcar conversaciones privadas a logs estándar.
- Si no hay credenciales, usar **modo demo claramente etiquetado**, determinista, con contenidos de ejemplo originales y tests; no fingir IA conectada.

## 7. Sistema QR — exigencia de robustez

El QR une dispositivos, pero **no debe ser la identidad permanente del usuario**.

Casos de prueba obligatorios:

- Código válido antes del vencimiento: canje exitoso exactamente una vez.
- Código vencido: no canje; opción de pedir uno nuevo al kiosco.
- Dos teléfonos compiten por el mismo QR: solo uno gana, sin duplicados.
- QR fotografiado por tercero: ventana breve de exposición; UX de confirmación y advertencia; evaluar pairing de doble confirmación o PIN visible en kiosco.
- Kiosco vuelve a modo público y no muestra datos anteriores.
- Visitante sin email continúa normalmente y puede guardar en la misma sesión, con política de caducidad visible.
- La persona que verifica su email recupera desde otro dispositivo sin revelar credenciales ni chat a terceros.
- QR no guarda PII en URL, cache, analytics o referer; usar `Referrer-Policy: no-referrer` en la pantalla de canje y redirigir tras redención.
- Logs y sistemas de monitorización no deben registrar tokens en bruto.
- Rate limits y protección anti-bot.
- Códigos aleatorios de al menos 128 bits de entropía, generados con CSPRNG, validados servidor y almacenados como hash.

## 8. Email y relación a largo plazo — Vercel + proveedor de correo

Preferencia por **Resend** o el proveedor ya configurado. Implementar adapter `EmailProvider` con `sendTransactional`, `sendConfirmation`, `sendReminder`, `sendMarketing` y simulador de desarrollo. Configurar dominio/sender verificado, SPF/DKIM/DMARC, rebotes, complaints, suppressions y webhooks con autenticación de firma, reintentos idempotentes y cola/outbox. **No afirmar entrega basándose solamente en una respuesta HTTP satisfactoria**.

Plantillas HTML y texto en español e inglés:

1. **«Continúa tu experiencia con Ary»**: acceso de recuperación seguro, qué conservamos y duración del enlace.
2. **«Confirma que deseas recibir novedades»**: double opt-in para marketing.
3. **«Tus lugares guardados»**: resumen solicitado por el visitante; link directo a experiencia propia tras autenticación.
4. **«Tu próxima experiencia cultural»**: recordatorio opt-in según tiempo y consentimiento.
5. **«Preferencias actualizadas / confirmación de baja»**: comunicaciones de servicio cuando corresponda.
6. **«Solicitud enviada a un proveedor»**: recibo detallando datos enviados y empresa receptora.

Cada email de marketing debe incluir identificación del remitente, finalidad, enlace de baja funcional y configuración de frecuencia. Evitar capturar menores o promover seguimiento identificable de niños; controles reforzados para públicos infantiles y revisión legal antes de habilitar marketing. No configurar campañas automáticas recurrentes hasta confirmar consentimiento verificable, reglas aplicables, supresión y consentimiento de destinatarios reales.

**Programación:** tareas en Vercel Cron si es compatible con plan actual, o un programador externo autorizado; ejecutor protegido con `CRON_SECRET` / firma; encolar y enviar en lotes controlados, con `idempotencyKey`, respetando cuotas, horarios y zona horaria. El cumplimiento exacto de periodicidades depende del plan y del proveedor: verificar, no asumir.

**Captura de leads:** email de visitante solo para recuperación/servicio si lo pidió. Consentimiento de marketing es separado. Leads que se comparten con proveedores: autorización adicional específica para ese proveedor, campos enumerados, con registro de aceptación. Rechazar cualquier funcionalidad que envíe automáticamente conversaciones o email a todos los proveedores.

## 9. Admin, CMS y panel de proveedores

### Panel de operador
- Indicadores: usuarios únicos estimados de forma responsable, sesiones por kiosco, ratio QR emitidos/canjeados, temas consultados, idiomas, contenidos vistos, favoritos y conversiones consentidas.
- Gráficos filtrados por periodo, kiosco, institución, categoría; no por individuo sin base legal específica. Mostrar tamaño de muestra y manejar grupos pequeños.
- Gestión de dispositivos, estado, versiones, health checks, incidencias y pruebas de la demo.
- Gestión de contenidos culturales con `draft` -> `review` -> `published`, fuente, editor y fecha de revisión. Revisión humana antes de que una recomendación pueda afirmar hechos turísticos sensibles.
- Gestión de traducciones, categorías, elementos destacados y QR a fichas públicas.
- Gestión de organizaciones, roles y permisos.
- Exportación CSV de **estadísticas agregadas**, no exportación indiscriminada de datos personales.

### Panel de proveedor
- Registro/invitación de empresa, verificación y aprobación manual.
- CRUD de experiencias y ofertas con revisión editorial/operador.
- Métricas propias: vistas, clics, consultas, conversiones y leads **autorizados**.
- Bandeja de solicitudes recibidas, con campos visibles según consentimiento; opción de responder dentro de canales permitidos.
- No visibilidad de sesiones, chats ni consultas de otros proveedores; no enumeración de perfiles de viajeros.
- Modos de monetización: suscripción B2B, licencia de kiosco, alquiler por evento, tarifa de integración, promoción patrocinada claramente rotulada. Preparar modelo de plan/tier solo si encaja con repo; no implementar cobros reales sin especificación y autorización.

## 10. Conexión con Raspberry Pi / robot físico

La app de Vercel será **servicio de internet y backend**, no un servidor persistente de WebSockets con hardware garantizado. No suponer que una función serverless puede mantener puerto serial abierto o conexión de larga duración hacia Raspberry Pi.

Proponer e implementar una frontera clara:

- **Web en Vercel**: identidad, contenidos, QR, perfiles/consentimientos, analítica y comunicaciones.
- **Servicio local en Raspberry Pi**: web/kiosk si aplica, captura audio local, control de servos y sensores mediante Python/ESP32/Arduino, cola local de eventos, caché cultural e intercambio seguro con nube.
- **Canal de sincronización**: peticiones HTTPS salientes desde Raspberry Pi, polling seguro o servicio de mensajes administrado compatible; autenticación de dispositivo, rotación de credenciales, nonces y validación de comandos. No abrir puertos inbound públicos hacia la Pi.
- **Modo offline**: bienvenida, contenidos culturales previamente aprobados, rutas guardadas locales sin secretos persistentes; sincronización posterior sin mezclar sesiones.
- **Estados**: `idle`, `welcome`, `listening`, `thinking`, `speaking`, `handoff_qr`, `offline`, `error`, `maintenance`.
- El frontend refleja estados reales, no `setTimeout` fingiendo movimiento. Si el hardware no existe todavía, crear `RobotAdapter` con `MockRobotAdapter` explícito y `HardwareRobotAdapter` documentado; un simulador verificable es aceptable, pero debe estar etiquetado.
- Audio y micrófono solo con activación clara; control de interrupciones, reducción de ruido y timeout.

## 11. Privacidad, legislación y gobernanza

Investiga y documenta las normas efectivamente aplicables al despliegue (República Dominicana, aeropuertos, consumidores internacionales, email marketing, menores, posibles visitantes de la UE y transferencias internacionales). **No afirmes que todo cumple GDPR/ley local solo porque hay un checkbox**. Prepara `docs/PRIVACY_COMPLIANCE_REVIEW.md` con puntos para revisión jurídica y responsables del tratamiento, plazos, contratos con encargados y países donde se procesan datos.

Requisitos técnicos desde el principio:

- Privacy by design: minimización de datos, propósitos definidos, ausencia de tracking comercial por defecto, separación de sesiones del kiosco, conservación limitada y visibilidad del uso de datos.
- Consentimiento granular, libre, informado, revocable y versionado; textos sencillos en el idioma elegido. Servicio básico disponible sin aceptar marketing.
- Página accesible de exportación y eliminación, eliminación de tokens y datos de perfil, cancelación de emails futuros y registro de ejecución. No prometer borrado irreversible instantáneo de backups si no se controla; explicar plazos de eliminación y excepciones.
- Opciones para sesión anónima y correo opcional. Evitar solicitar pasaporte, vuelo, documento, fecha de nacimiento exacta o geolocalización continua sin necesidad.
- No usar reconocimiento facial, nacionalidad inferida por aspecto o voz, rastreo invisible del pasajero ni venta de conversaciones personales.
- Proveedores solo acceden a información permitida; analítica agregada por defecto, leads individualizados solo con consentimiento explícito, y registro de accesos.
- Acortar retención de sesiones transitorias y eventos identificables; cron de limpieza probado.
- Políticas de protección para menores y flujos especiales cuando corresponda.
- Consent records comprobados en servidor antes de cada envío de marketing o cesión a terceros; la revocación bloquea próximas acciones.

## 12. Seguridad y calidad

- Autenticación fuerte de admins, MFA si proveedor actual lo permite, roles y aislamiento por tenant; impedir escalada horizontal/vertical.
- Seguridad Web OWASP: inyección, XSS, CSRF, SSRF, IDOR, uploads, enlaces de canje, rate limit y encabezados de seguridad; CSP ajustada a recursos reales.
- Prevención de enumeración de emails, throttling de magic links, caducidad, replay de QR, seguridad en cookies, sesión rotada al elevar privilegios.
- Sanitizar contenido de IA y contenidos de proveedores; no renderizar HTML no confiable sin protección.
- Idempotencia para envío de correos, leads, webhooks y canje.
- Observabilidad: errores estructurados, métricas de salud, requestId y eventos técnicos anonimizados; evitar PII en logs y herramientas de terceros.
- Rendimiento: optimizar imágenes y fuentes, bundle pequeño en kiosco Pi, pruebas mobile, progressive enhancement, fallback offline.
- Revisión de dependencias/licencias, no añadir un framework extra por moda.
- `README`/documentación de despliegue y playbook de incidentes de seguridad/credenciales.

## 13. Tests end-to-end y condiciones de aceptación

Crear pruebas automáticas (framework actual, Playwright/Vitest/Jest según corresponda). Definir fixtures sin emails ni usuarios reales:

1. Kiosco -> generar QR -> escanear con cliente móvil simulado -> canjear -> continuar intereses y favoritos -> kiosco limpio.
2. Canje doble/concurrente, QR caducado, token alterado, intentos excesivos.
3. Cliente sin email -> experiencia útil; usuario con email sin marketing -> solo transaccional solicitado; marketing sin opt-in -> **cero envíos**.
4. Confirmación double opt-in -> suscripción activa -> recordatorio programado -> baja -> cero campañas posteriores.
5. Recuperación por magic link, invalidación tras uso, email enum protection.
6. Selección de país e intereses -> recomendación explicable y basada en fichas aprobadas; no estereotipos.
7. Panel proveedor A intenta acceder a datos de B -> 403/no data; export agregado sin conversaciones privadas.
8. Consentimiento para proveedor A -> solo campos elegidos; retirada de consentimiento -> bloquear futuras entregas.
9. Exportar/eliminar cuenta de prueba; limpiar sesiones/QR expirados.
10. IA ausente -> fallback informativo sin inventar respuestas.
11. Servicio de mail no configurado -> UI clara con estado pendiente, sin afirmar envío.
12. Healthcheck y modo hardware simulado sin fingir que un servo físico se movió.
13. Tests accesibilidad de teclado y contraste para móvil/kiosco.
14. Build y typecheck para despliegue Vercel, sin secretos incrustados ni endpoint admin abierto.

**Definition of Done** mínimo: una ruta funcional desde sesión anónima en kiosco, QR seguro, continuidad móvil, guardado de intereses/favoritos, recuperación por correo mediante adaptador bien implementado, consentimiento granular, correo en sandbox, panel admin con métricas agregadas y al menos un test de aislamiento de proveedores. Si faltan credenciales, dejar integración y pruebas listas, reportando qué configuración impide la ejecución real. No dar por completado lo que dependa de terceros sin verificar.

## 14. Datos demo y narrativa de la WRO

Incluir un `demo seed` **inequívocamente marcado como contenido de demostración** con lugares y temas dominicanos culturalmente respetuosos, siempre con URLs reales y verificables si hay acceso a internet; de lo contrario, no inventar citas ni horarios. Preparar recorrido de 5 minutos:

1. Ary en kiosco recibe al viajero y pregunta país/idioma/intereses (voluntarios).
2. Selecciona una historia o actividad dominicana y explica la conexión cultural sin suponer gustos por origen.
3. Muestra el QR de sesión, el visitante lo escanea y continúa en móvil con preferencias preservadas.
4. Guarda una experiencia y, si quiere, solicita enlace de recuperación por correo; marketing no premarcado.
5. Un proveedor recibe únicamente una solicitud cuando el turista la envía expresamente; operador ve la métrica anónima de conversión.
6. Panel técnico muestra eventos reales o simulados claramente distinguidos, junto a evidencias de la robótica física.

Crear `docs/WRO_DEMO_SCRIPT.md`, `docs/WRO_TECH_DIAGRAM.md` y `docs/ARY_B2B_BUSINESS_MODEL.md` con desglose de ingresos potenciales (licencias, instalación, alquiler, mantenimiento, patrocinio identificado), costos (hardware, APIs, correo, soporte y alojamiento), métricas operativas y supuestos explícitos, sin inventar contratos ni resultados reales.

## 15. Roadmap de ejecución y prioridad si el tiempo es limitado

**P0 — implementar de inmediato, vertical slice completo**
- Auditoría repo y baseline.
- Persistencia de sesiones y esquema seguro.
- Página de kiosco + QR seguro + canje móvil + reseteo kiosco.
- Perfil optativo (idioma/país/intereses) + contenido cultural aprobado.
- Favoritos / `Mi cultura`.
- Consentimiento granular y página de privacidad.
- Recuperación por enlace mágico y adapter de emails con modo seguro.
- Tests básicos y build Vercel.

**P1 — dentro de la misma ejecución, si P0 está estable**
- Recomendación IA fundamentada y chat continuable.
- Dashboard de analítica agregada.
- Tenants, login admin y proveedor, contenido/ofertas, políticas de visibilidad.
- Leads explícitamente consentidos y panel del proveedor.
- Plantillas de emails, double opt-in, supresiones y preferencias.
- Cron/outbox idempotente.

**P2 — después de P0/P1 sin degradarlos**
- Integración de dispositivo físico, estados y eventos.
- QR a experiencias, itinerarios adaptativos, historial cultural opcional.
- Modo offline, exportación y borrado completos.
- Observabilidad, instrumentación y tests E2E extendidos.
- Panel financiero B2B/administración avanzada.

El agente puede reorganizar tareas según las capacidades existentes, pero debe explicar cambios de prioridad. **No terminar tras escribir el plan**: entregar código probado.

## 16. Variables de entorno a considerar (adaptar al stack real)

No pegar valores reales en archivos versionados. Crear `.env.example` documentado:

```dotenv
APP_BASE_URL=https://TU-DOMINIO-REAL
DATABASE_URL=
AUTH_SECRET=
SESSION_ENCRYPTION_KEY=
RESEND_API_KEY=
EMAIL_FROM=ARY <no-reply@tu-dominio-verificado>
EMAIL_REPLY_TO=
CRON_SECRET=
AI_GATEWAY_API_KEY=
AI_MODEL=
ROBOT_DEVICE_AUTH_SECRET=
ANALYTICS_RETENTION_DAYS=90
VISITOR_SESSION_TTL_HOURS=24
QR_HANDOFF_TTL_SECONDS=120
FEATURE_ENABLE_MARKETING=false
FEATURE_ENABLE_PARTNER_SHARING=false
EMAIL_DRY_RUN=true
```

Son **ejemplos conceptuales**, no un contrato obligatorio: usa nombres existentes y elimina duplicados. Nunca uses secretos públicos `NEXT_PUBLIC_*` para claves sensibles. En producción, `EMAIL_DRY_RUN` solo se desactiva tras verificación real de remitente y controles de consentimiento. Los valores de retención/TTL se deben revisar jurídicamente y documentar, no adoptar por inercia.

## 17. Entregables finales del agente

Al terminar, imprime y guarda:

- `docs/ARY_IMPLEMENTATION_PLAN.md` con casillas cumplidas y pendientes.
- `docs/ARY_ARCHITECTURE.md` con diagrama de flujos Vercel ↔ móvil ↔ BD ↔ email ↔ Raspberry Pi.
- `docs/ARY_SECURITY_AND_PRIVACY.md` + revisión legal pendiente.
- `docs/ARY_EMAIL_SETUP.md`: verificación de dominio, proveedor, variables, plantillas, dobles opt-ins, webhooks, cron, baja y pruebas.
- `docs/ARY_QR_HANDOFF.md`: amenazas, expiración, canje, recuperación y pruebas de concurrencia.
- `docs/ARY_OPERATOR_AND_PARTNER.md`: permisos, datos visibles, consentimiento de leads y analítica.
- `docs/ARY_WRO_DEMO_SCRIPT.md` con una demo reproducible sin información personal real.
- Migraciones ejecutables + test data seguro + scripts de reset de demo si procede.
- Tabla de estado **Función | Implementado | Probado | Requiere configuración | Evidencia**.

**Instrucción final:** trabaja ya en el repositorio. El ZIP aportado es una web estática real y debe ser el punto de partida visual y de contenidos; NO reinventar el sitio ni afirmar que ya existe backend. No respondas solo con una explicación, no pidas que vuelva a enumerar requisitos ya descritos, no rehagas la aplicación si existe una base funcional. Implementa todo lo viable de un tirón, verifica los resultados y deja identificado con precisión lo que aún requiera cuentas, DNS, recursos, credenciales, permisos o hardware físico. Ante incertidumbres no críticas, elige un estándar seguro y documenta la decisión. Para operaciones irreversibles o mensajes a destinatarios reales, solicita autorización antes de ejecutarlas.
