# Etapa 2 · diseño de implementación

Objetivo: empezar sin cuenta, descubrir contenido dominicano verificable y trasladar preferencias y guardados a una sesión móvil nueva mediante un QR efímero.

Se conserva la landing. La app usa sus colores, HTML semántico, controles locales pequeños y CSS propio; no se añade una biblioteca de UI al kiosco. Navegación, título y estado preceden a la acción principal. País e intereses son opcionales. No hay inferencias por nacionalidad.

```text
AppShell (navegación, idioma, privacidad)
  Kiosk (idle / welcome / preferences / recommendations / handoff / finished)
    ConnectivityStatus + DeviceStatus
    PreferenceForm (select de país, chips de intereses)
    RecommendationList → CulturalCard → ExampleAnswer
    HandoffPanel (SVG, confirmación, cuenta atrás, cancelar)
  Experience (sesión, preferencias editables, recomendaciones, guardar)
  MyTrip (progreso, pendiente / realizado, favorito, quitar, QR público)
  Redeem (resumen por categorías, confirmación explícita, error seguro)
  Activation (confirmación explícita del dispositivo)
  Privacy / RecoveryComingSoon / PublicCulturalItem
```

Móvil de 360–390 px: una columna, navegación que envuelve y controles de 48 px. Tablet: columnas intrínsecas. Escritorio 1280–1920: ancho de lectura limitado y tarjetas en rejilla; kiosco con acción clara y mascota optimizada. Se incluyen carga, vacío, error recuperable, desconexión, permisos, foco y reduced-motion.

| Riesgo | Corrección prevista |
| --- | --- |
| Parecer una IA o robot conectado | Etiquetas de reglas, demostración, respuestas de ejemplo y simulador |
| QR confundido con compartir ficha | Superficies y etiquetas separadas; QR público sin sesión |
| Demasiadas preguntas iniciales | Preferencias opcionales con omitir |
| Fuga del visitante anterior | Limpieza transaccional y retorno idle por transferencia/cancelación/90 s |
| Tarjetas y botones amontonados en móvil | Rejilla intrínseca, textos que envuelven, botones grandes |

Validación: pruebas de dominio con PostgreSQL PGlite real, API, carrera de canje, E2E de varios contextos y regresión existente. Dos pasadas visuales reales si Chromium puede ejecutarse; cualquier bloqueo queda identificado sin afirmar revisión visual.
