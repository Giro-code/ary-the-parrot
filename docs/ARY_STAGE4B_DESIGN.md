# Etapa 4B: diseño previo

Objetivo: el operador administra contenidos y dispositivos y consulta tendencias anónimas; cada proveedor administra sus ofertas y únicamente solicitudes expresamente dirigidas a él. El visitante elige destinatario y campos antes de confirmar.

Arquitectura: acceso propio `/admin/entrar`, cookie y sesiones de staff independientes; navegación de administración por tarea, filtros de periodo/kiosco y tablas con supresión. Partner selecciona una membresía autorizada mediante `organizationId`; el servidor vuelve a comprobarla en cada operación y la incorpora al SQL.

Dirección visual: conservar crema, verde y tipografía de la aplicación, bordes sencillos y acciones con etiquetas. Sin librerías gráficas ni nuevas dependencias de UI. No existe `components.json`; usar los controles semánticos existentes. La landing no se modifica.

Árbol: `StaffPage → StaffShell → Overview / Devices / ContentEditor / Organizations / Campaigns / Inquiries / Deletions`; `PartnerPage → StaffShell → PartnerOverview / OffersEditor / LeadInbox`; `Experience/Trip → ProviderOffers → LeadConfirmation`; `AccountPrivacy → SharedRequests`.

Estados: carga estable, vacío con explicación, error con reintento, formulario ocupado y deshabilitado, éxito explícito y acceso denegado. Enlaces de activación visibles solo tras crearlos y descartables. Campos de lead desmarcados; correo verificado necesario para compartirlo; confirmación y consentimiento obligatorios.

Responsive: navegación y filtros envuelven; formularios en una columna en móvil; tablas comparables con scroll local y encabezados; controles de al menos 44px; texto largo ajustable. Verificación prevista a 360, 390, 820 y 1440px.

Riesgos y correcciones: demasiadas tarjetas → regiones y tablas por tarea; datos demo ambiguos → etiquetas Demo y cuentas invalid; cifras pequeñas reveladas por ratios → suprimir también ratios y CSV; formularios técnicos → etiquetas y ayudas concretas; tabla ancha → contenedor de scroll local y envoltura de textos.

Revisión visual: aplicar dos pasadas reales tras implementación si el runtime lo permite. Los E2E generan capturas para el revisor; su escritura o ejecución sin inspección no constituye aceptación visual.
