# Demo WRO reproducible · cinco minutos

Solo datos ficticios. Preparación fuera del tiempo de exposición, en una terminal PowerShell nueva y con el servidor detenido:

```powershell
$env:DATABASE_URL = ''
$env:PGLITE_DATA_DIR = '.cache/wro-demo'
$env:APP_BASE_URL = 'http://127.0.0.1:3000'
$env:EMAIL_DRY_RUN = 'true'
$env:GEMINI_API_KEY = ''
$env:FEATURE_ENABLE_PARTNER_SHARING = 'true'
$env:FEATURE_ENABLE_MARKETING = 'false'
npm run db:migrate
npm run db:seed
npm run demo:seed
npm run kiosk:enroll -- --label 'DEMO WRO · simulador'
npm run dev
```

Usar la URL de activación privada del CLI únicamente en la ventana del kiosco. No proyectar ni copiar tokens en evidencias. `db:seed` comprueba fuentes por HTTP: comprobar que haya fichas publicadas antes de la exhibición; no inventar fuentes si falla la conexión. `demo:seed` es idempotente y crea Demo Airport (ficticio), dos proveedores, ofertas DEMO, cuatro correos @example.invalid y 129 eventos sintéticos. No crea leads ni suscriptores de marketing.

Preparar tres perfiles de navegador: kiosco, visitante y proveedor. Usar `/admin/entrar` con `admin.demo@example.invalid` y `provider-a.demo@example.invalid`; abrir cada enlace desde `/dev/outbox` en su perfil y confirmar. B solo pertenece a `provider-b.demo@example.invalid`. Estas direcciones no son buzones reales; únicamente la bandeja local permite la demo. La sesión de personal no autoriza como visitante. No abrir el mismo PGlite desde dos procesos.

Para teléfono físico hace falta un origen autorizado accesible desde él y configurar `APP_BASE_URL` en consecuencia. El comando mostrado es para simulación local con dos perfiles, no prueba de red móvil real.

| Tiempo | Acción y narración |
| --- | --- |
| 0:00–0:45 | Abrir `/kiosco`; mostrar «Simulador»/«no conectado» como corresponda. Iniciar; idioma, país e intereses voluntarios. «Explorar no exige correo ni compartir datos». |
| 0:45–1:30 | Elegir música/gastronomía y ver recomendaciones. Abrir una ficha y su fuente. Mostrar un puente cultural si existe para el país elegido; explicar que el país no determina el ranking. Hacer una pregunta cultural y señalar «Respuestas de ejemplo»: la demo desactiva Gemini. |
| 1:30–2:15 | Guardar una ficha. Generar QR privado desde el kiosco activado. Abrir el QR en el perfil móvil, introducir código y confirmar. Ver idioma, intereses y guardado conservados; el kiosco queda limpio. Distinguir el QR público de ficha del QR privado de transferencia. |
| 2:15–3:00 | En Mi viaje solicitar recuperación para `visitante.wro@example.invalid`. Marcar únicamente conservación/recuperación. Abrir outbox y confirmar en el perfil visitante. Mostrar «modo prueba: correo no enviado». Ver guardado restaurado. |
| 3:00–4:00 | Elegir «Enviar mi solicitud a Demo Taller del Caribe (ficticio)». Leer destinatario/finalidad. Elegir correo y mensaje; escribir «Consulta ficticia WRO». Confirmar consentimiento y enviar. En el perfil proveedor abrir `/partner/leads`: solo correo y mensaje. Mostrar que B no puede consultar A. |
| 4:00–4:35 | En visitante abrir `/cuenta/privacidad`, revocar esa solicitud; recargar la bandeja del proveedor y comprobar que desapareció. «Bloqueamos próximos accesos; lo ya visto no se puede recuperar». |
| 4:35–5:00 | En `/admin` mostrar muestra, agregados y «<10» sin identidades. Aclarar que las cifras DEMO son sintéticas. Mostrar último evento/estado en dispositivos; no afirmar movimiento físico. Cerrar con fuente, privacidad y separación nube/Pi del diagrama técnico. |

Para resetear, parar dev y ejecutar en la misma terminal:

```powershell
npm run demo:reset
npm run demo:seed
```

El reset elimina únicamente el namespace de organizaciones, personal, ofertas y eventos del seed 4B; preserva el seed cultural y otras cuentas, incluido el visitante de la exposición. Borrar ese visitante desde su propia página de privacidad al terminar. No reiniciar globalmente la BD ni borrar proyectos. Se puede usar una carpeta PGlite nueva para un recorrido totalmente nuevo.

Validación preparada para el revisor:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- --project=stage4b
```

La ejecución de navegador/build puede requerir salir del sandbox que bloquea subprocesos. No cambiar configuración para rodearlo. [Resultados reales de esta etapa](ARY_STAGE4B_REPORT.md); las capturas E2E deben mirarse en dos pasadas antes de declarar aceptación visual.
