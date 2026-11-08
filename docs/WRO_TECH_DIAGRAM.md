# Diagrama técnico WRO

```mermaid
sequenceDiagram
  participant K as Kiosco / simulador
  participant V as Vercel / Next.js
  participant D as PostgreSQL
  participant M as Móvil
  participant E as Email dry-run
  participant P as Proveedor autorizado
  K->>V: Sesión anónima, intereses voluntarios
  V->>D: Preferencias y recomendaciones con fuentes
  K->>V: Crear QR (kiosco activado)
  V->>D: Hash, TTL y código confirmatorio
  V-->>K: QR privado efímero
  M->>V: Confirmar canje
  V->>D: Consumir una vez, nueva sesión, copiar y limpiar kiosco
  V-->>M: Cookie de visitante / Mi viaje
  M->>V: Solicitar recuperación opcional
  V->>D: Enlace de 15 min y outbox cifrada
  V->>E: Despachar después de commit
  E-->>M: Solo bandeja local en la demo
  M->>V: Confirmar proveedor + campos + finalidad
  V->>D: Consentimiento y lead cifrado con TTL
  V->>E: Recibo inmediato (dry-run)
  P->>V: Cookie staff + organizationId
  V->>D: SQL por tenant, consentimiento vigente y caducidad
  V-->>P: Solo campos autorizados
  M->>V: Revocar
  V->>D: Revocar consentimiento y eliminar payload
  P->>V: Recargar bandeja
  V-->>P: Lead invisible
```

Nube/Pi/Gemini y fronteras completas: [arquitectura](ARY_ARCHITECTURE.md). La Raspberry Pi mantiene el control físico local; Vercel solo recibe telemetría firmada y ofrece mantenimiento secundario. En esta demo no se contacta Gemini, no sale correo y no se acredita hardware físico.

El operador ve agregados, muestra y supresión, nunca el chat o una lista de correos en analítica. Eventos de demo se crean sintéticamente; no son visitantes reales ni resultados comerciales.
