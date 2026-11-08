import Link from "next/link";

export default function KioskPage() {
  return (
    <main className="stage-notice">
      <p className="eyebrow">Ary · Kiosco</p>
      <h1>Una bienvenida con Ary.</h1>
      <p>El kiosco interactivo estará disponible en la etapa 2. El inicio de sesión anónima, las preferencias y el QR para continuar en tu teléfono están pendientes de implementación.</p>
      <p>El hardware está previsto en modo simulador. La web de presentación incluye una demostración guiada con respuestas de ejemplo.</p>
      <nav aria-label="Continuar explorando">
        <Link href="/#inicio">Volver a la web de Ary</Link>
        <Link href="/experiencia">Conocer el acceso para móvil</Link>
      </nav>
    </main>
  );
}
