# Etapa 8 · diseño e implementación

Objetivo: conversar cómodamente desde un teléfono, conservar viajes y conversaciones con consentimiento y descubrir la cultura dominicana desde la portada.

Árbol: Experience → VoiceShell (marca, viajes, conversaciones, idioma, menú de sesión) → EmailWelcome / AryChat (AryStage compacto, estado, ConversationScroll, VoiceComposer). Conversations → Shell → lista → detalle → continuar/borrar → privacidad. Landing estática → navegación → hero cultural + TalkToAry → lugares con créditos → demo/producto/historia → formulario B2B.

Jerarquía: el chat es principal; Ary acompaña con 64 px en móvil y 88 px en escritorio. Una sola región principal desplazable llena el espacio restante de 100dvh. Entrada inferior con área segura. Columna de mensajes de 760 px. La bienvenida usa formulario de una columna, sin casillas premarcadas, errores y espera explícitos. No se añade una biblioteca UI al sistema CSS existente.

Riesgos y correcciones antes de implementar:

| Riesgo | Corrección |
| --- | --- |
| Mascota domina la conversación | Franja pequeña con estado al lado |
| Navegación comprimida en móvil | Dos filas intrínsecas y etiquetas claras |
| Tarjetas y burbujas recortadas | min-width: 0, wrapping y ancho central limitado |
| Estética turística genérica | Fotografía dominicana acreditada, papel cálido, verde profundo y tipografía editorial |
| Promesa falsa de correo/IA | Aviso dry-run visible y fallback honesto, sin afirmar entrega |

Estados a revisar: bienvenida ES/EN, términos sin marcar, marketing opcional, envío/error, sesión provisional y cupo agotado, verificación, chat largo, teclado/voz, offline, QR y expiración, historial vacío/lista/detalle/continuación/borrado, viajes vacíos/poblados, B2B y menú móvil. Anchos: 360, 390, 430, 768, 1280, 1440 y 1920. WebKit/iPhone y Chromium/Android son emulación, no dispositivos físicos.

No se toca legacy, no se publica ni se envían correos. Pruebas de IA exclusivamente simuladas.
