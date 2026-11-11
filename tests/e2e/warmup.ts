// The stage E2E server is `next dev`: compiling many routes at once while tests run makes
// Turbopack send full-page reloads to open tabs. Compile every route once, in order, first.
const routes = ["/mis-conversaciones", "/terminos","/kiosco", "/experiencia", "/mi-cultura", "/privacidad", "/reingresar", "/cuenta/privacidad", "/dev/outbox",
  "/kiosco/activar", "/auth/verify", "/email/confirm", "/email/baja", `/q/${"a".repeat(43)}`, "/cultura/00000000-0000-4000-8000-000000000000",
  "/admin/entrar", "/admin", "/partner", "/api/health", "/api/visitor/me", "/api/kiosk/me", "/api/kiosk/bridge-token"];
export default async function warmup() {
  for (const route of routes) await fetch(`http://127.0.0.1:3002${route}`, { redirect: "manual" }).then(r => r.arrayBuffer()).catch(() => undefined);
}
