import Link from "next/link";

export default function ExperiencePage() {
  return (
    <main className="stage-notice">
      <p className="eyebrow">Ary · Experiencia móvil</p>
      <h1>Tu próximo descubrimiento.</h1>
      <p>La experiencia cultural para tu teléfono estará disponible en la etapa 2. El recorrido, la conversación y la continuidad por QR están pendientes de implementación.</p>
      <p>Mientras tanto, puedes conocer el proyecto y probar la demostración guiada de la web.</p>
      <nav aria-label="Continuar explorando">
        <Link href="/#inicio">Volver a la web de Ary</Link>
        <Link href="/kiosco">Conocer el acceso para kiosco</Link>
      </nav>
    </main>
  );
}
