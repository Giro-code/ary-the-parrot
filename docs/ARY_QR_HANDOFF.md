# QR de continuidad · etapa 2

Implementado el 7 de noviembre de 2026. Pruebas de dominio/API con PostgreSQL PGlite en memoria; Neon y navegación multidispositivo real pendientes.

## Credenciales y autorización

`ary_sid` contiene 32 bytes CSPRNG en base64url. La BD almacena solo SHA-256. Cookie HttpOnly, SameSite=Lax, Path=/, Secure en producción, duración fija según `VISITOR_SESSION_TTL_HOURS` (24 h por defecto). No hay secretos en localStorage.

El kiosco usa otra cookie, `ary_kiosk`, con una credencial aleatoria cuyo hash reside en `kiosk_devices`. Activación explícita mediante POST, código de un uso y TTL de diez minutos; el GET de activación no autentica. La activación rota la credencial y revoca la anterior. El script permite reactivar un UUID existente. Sin credencial activa no se genera QR; una sesión móvil tampoco puede generar uno usando un dispositivo distinto.

Todas las operaciones mutantes requieren Origin/Host coherentes con `APP_BASE_URL` (o el host local en desarrollo) y `X-Ary-Request: 1`. Se rechazan cuerpos adicionales, IDs inválidos y payloads mayores de 8192 bytes. Zod valida los contratos. Las respuestas incluyen `{error,message,requestId}` y no vuelcan excepciones de la BD.

## Creación, vista previa y canje

1. Una sesión activa ligada a un kiosco autorizado genera 32 bytes aleatorios. Solo se guarda el hash del token, no la URL ni su valor original.
2. `qrcode` genera en servidor un SVG con `${APP_BASE_URL}/q/<token>`. No incluye preferencias, PII ni identificadores de sesión. TTL 120 s por defecto (máximo 300 s); regenerar invalida el código anterior.
3. GET `/q/[token]` solo consulta. Muestra las categorías a recuperar y un código aleatorio de dos dígitos visible también en el kiosco, sin mostrar el país, los intereses concretos, los guardados ni sus cantidades. Cabeceras no-referrer/no-store/noindex. El GET no crea sesiones, no incrementa intentos y no consume el token.
4. El visitante compara el número y pulsa «Continuar mi experiencia». POST incluye el token en el cuerpo y el código de confirmación.
5. Se bloquea la fila de sesión de origen y se ejecuta un UPDATE condicional en una transacción: token correcto, sin uso, sin invalidación y `expires_at > now()` del servidor PostgreSQL. El reloj es inyectable únicamente desde las pruebas de dominio, nunca desde el body HTTP. El UPDATE con RETURNING es la frontera de uso único.
6. Dentro de la misma transacción se crea una sesión móvil nueva, se copian preferencias y guardados (incluidos estado/favorito), se registra el consumidor y se limpian preferencias, guardados, recomendaciones y chat operativos del kiosco. Su sesión queda `transferred` con país vacío e intereses vacíos. Un error revierte también el consumo del token.
7. El móvil recibe su propia cookie. `location.replace('/experiencia')` retira el token de la dirección actual. El kiosco consulta estado cada 1,5 s, muestra la transferencia y vuelve a idle en 4 s.

Expiración/cancelación/inactividad: el kiosco oculta sus datos inmediatamente, cancela en servidor y vuelve a idle. Avisa desde los 70 s y finaliza a los 90 s de inactividad. Puede terminarse en cualquier momento. Si la red falla, no se promete una cancelación remota: el QR conserva como máximo su TTL original; antes de empezar otra experiencia se exige completar la limpieza del servidor. `db:cleanup` realiza la limpieza física pendiente.

## Amenazas y controles

| Amenaza | Control y límite |
| --- | --- |
| Adivinar/enumerar tokens | 256 bits CSPRNG; hash en BD; cinco intentos por token y rate limit persistente por cliente |
| Replay o dos móviles compitiendo | Transacción y UPDATE condicional; solo un consumidor |
| Fallo al copiar datos | Rollback de toda la transacción; prueba con trigger de fallo sintético |
| QR fotografiado | TTL corto, confirmación visual y advertencia. **Los dos dígitos no son un segundo factor**: quien tenga el QR puede verlos y el primer POST válido gana. No existe aprobación adicional desde el kiosco |
| CSRF | Origin/Host + header propio, SameSite y body JSON |
| IDOR | Identidad derivada de cookie; todos los guardados se filtran por propietario; nunca se aceptan owner/session IDs del cliente |
| Fuga por referrer/caché | no-referrer, no-store, noindex; sin terceros en la pantalla; token en body del POST |
| Fuga por logs | La app no registra tokens; logging de URLs entrantes de Next dev desactivado. Revisar/redactar access logs, CDN, observabilidad, historial, capturas y trazas de la plataforma antes de producción |
| IP en BD | HMAC con sal; nunca IP en bruto. `X-Forwarded-For` debe ser normalizado por un proxy de confianza; no es identidad infalible |
| Estado público anterior | Borrado transaccional y limpieza previa al siguiente inicio; respuestas tardías no repueblan la UI tras reset |

Límites por ventana: mutaciones 90/min por cliente, sesiones nuevas 20/min por cliente, canjes 15/min por cliente y 5/5 min por token, QR 8/min por dispositivo. `attemptCount` permanece asociado al QR hasta su limpieza. El código de confirmación no se guarda en analytics. Los eventos solo admiten campos de categoría/control explícitos.

## Evidencia y límites conocidos

`tests/unit/database.test.ts`: Promise.all con dos canjes, uno solo gana; canje repetido, expirado, alterado, intentos agotados, rollback, cancelación, reemplazo, rotación, aislamiento, copia exacta y limpieza. `tests/unit/api.test.ts`: contratos HTTP, cookies, CSRF, payloads, SVG real, autorización y canje. Estas pruebas pasan con migración real, sin correo ni servicios externos.

`tests/e2e/stage2.spec.ts` contiene los contextos A/B/C, móvil 390 px, cancelación, timeout, teclado, sin correo y CPU 4×. Está descubierto por Playwright pero **no ejecutado**: `spawn EPERM`. No hay evidencia actual de Raspberry Pi, navegador real, Neon remoto, Vercel, HTTPS/cookies en dispositivo ni dos inspecciones visuales. No se ha desplegado ni publicado.

La retención legal, purga programada, backups/restauración, normalización de IP del proxy, rate limiting distribuido frente a ataques volumétricos y redacción de logs de infraestructura requieren operación/revisión adicional. Los esquemas de correo, consentimiento y organizaciones están preparados; esas funciones corresponden a otras etapas.

Si se pierde la respuesta después del commit, el código ya estará consumido aunque el móvil no haya recibido su cookie. Esta etapa no ofrece recuperación de ese canje: habrá que iniciar una experiencia nueva. Nunca se reabre un token utilizado para intentar resolver un fallo de red.

Referencias técnicas consultadas: [Drizzle con Neon y transacciones](https://orm.drizzle.team/docs/connect-neon), [Drizzle con PGlite](https://orm.drizzle.team/docs/get-started/pglite-new), [logging de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/logging).
