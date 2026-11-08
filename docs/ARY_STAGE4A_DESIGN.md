# Diseño de etapa 4A

El visitante pregunta sobre cultura después de las recomendaciones y continúa desde su móvil. La empresa prepara su solicitud, revisa el aviso y autoriza el envío en un segundo paso.

Se conserva el sistema crema/verde, las superficies y los controles nativos existentes. El chat presenta modo, preguntas sugeridas, conversación con fuentes y formulario en ese orden. En móvil todo se apila y los textos largos se parten. Los controles mantienen foco visible y objetivos de 48 px.

```text
Kiosk / Experience
  RecommendationList
  AryChat
    ModeStatus
    SuggestedQuestions
    Conversation + CitationLinks
    MessageForm + Loading / Error / Limit
Kiosk
  ConnectionStatus
  RobotStatus + LocalBridgeAdapter
LandingRequestResult
  ConsentCheckbox + PrivacyLink
  SendButton + RetryButton + ExistingTXT
```

| Riesgo | Decisión |
| --- | --- |
| Chat que desplaza la acción principal | Región separada debajo de recomendaciones |
| Estado de IA engañoso | Rótulo por respuesta y modo efectivo del servidor |
| Fuentes o respuestas desbordadas | Texto plano, enlaces partidos y ancho de lectura |
| Consentimiento oculto | Segundo paso visible, casilla desmarcada y foco en el resultado |
| Robot conectado ficticio | Simulador explícito, conexión local y telemetría autenticada separadas |

Se cubren carga inicial, offline con backoff, envío, fallo recuperable, límite, fuentes ausentes, simulador, puente ausente y error serie. La presencia muestra bienvenida sin crear sesión. TTS y micrófono quedan para una etapa posterior con permisos explícitos.

La revisión visual requiere dos pasadas reales en escritorio y móvil. Un bloqueo de runtime o navegador se registra como pendiente.
