# Etapa 3 · diseño mínimo

Objetivo: conservar voluntariamente Mi viaje mediante correo verificado, controlar los datos y registrar solicitudes B2B por separado. La acción principal es pedir un enlace; el control del correo se demuestra solo mediante POST de confirmación. La landing debe conservar sus píxeles en reposo; la regresión visual de esta etapa sigue pendiente.

Árbol: Shell → RecoveryForm (correo, finalidad, recuperación obligatoria, marketing opcional); Shell → VerifyLink (confirmación, error, retorno); Shell → AccountPrivacy (datos, consentimientos, preferencias, exportación, confirmación de borrado); DevOutbox → mensajes de prueba renderizados. Experience y Trip añaden enlaces a recuperación y privacidad. Landing conserva formulario/TXT y añade resultado asíncrono.

Dirección visual: CSS, paleta crema/verde, tipografía y componentes existentes. Sin nueva librería. Formularios de una columna con ancho de lectura, casillas nativas etiquetadas, acciones que se apilan en móvil, foco visible, texto largo envolvente. Estados de carga, envío, éxito honesto, ausencia de sesión, error/reintento y confirmación destructiva explícita.

Riesgos y medidas: demasiados paneles → secciones con separadores; falsa entrega → estados dry_run/queued explícitos; consentimiento confuso → casillas distintas sin preselección; móvil estrecho → min-width cero y acciones envolventes; acceso accidental por scanner → GET nunca consume enlaces. Evidencia visual en VISUAL_REVIEW.md, sin atribuir validación a capturas no inspeccionadas.
