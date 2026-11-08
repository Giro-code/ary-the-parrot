"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { api, ApiError } from "./api";
export function StaffShell({ title, partner, organizationId, role, children }: { title: string; partner?: boolean; organizationId?: string; role?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const links = partner ? [["", "Resumen"], ["ofertas", "Ofertas"], ["leads", "Solicitudes"]] : [["", "Analítica"], ["dispositivos", "Dispositivos"], ["contenidos", "Contenidos"], ["organizaciones", "Organizaciones"], ["campanas", "Campañas"], ["solicitudes", "Solicitudes B2B"], ["privacidad", "Borrados"]].filter(([path]) => role === "analyst" ? ["", "dispositivos"].includes(path) : role === "operator" ? path !== "organizaciones" : true);
  return <div className="ary-app staff-app"><a className="skip" href="#main">Saltar al contenido</a><header className="app-header"><Link className="brand" href="/">ARY <span>{partner ? "Proveedores" : "Administración"}</span></Link><Link href="/admin/entrar">Acceso del personal</Link></header><div className="staff-layout"><nav aria-label="Panel de personal">{links.map(([path, label]) => <a key={path} aria-current={pathname === `/${partner ? "partner" : "admin"}${path ? `/${path}` : ""}` ? "page" : undefined} href={`/${partner ? "partner" : "admin"}${path ? `/${path}` : ""}${organizationId ? `?organizationId=${organizationId}` : ""}`}>{label}</a>)}<button className="secondary" onClick={() => void api("/api/staff/logout", "POST", {}).then(() => router.replace("/admin/entrar"))}>Cerrar sesión</button></nav><main id="main" tabIndex={-1}><h1>{title}</h1>{children}</main></div><footer>Ary · Acceso restringido por membresía. MFA nativo no disponible.</footer></div>;
}
const messages: Record<string, string> = { staff_required: "Entra con tu enlace de personal.", staff_forbidden: "Tu membresía no permite esta acción o esta organización.", source_blocked: "Usa una fuente HTTPS pública. Las direcciones locales o privadas están bloqueadas.", source_not_verified: "No se pudo verificar la fuente. Revisa la URL e inténtalo de nuevo.", reviewed_source_required: "Verifica la fuente y envía la ficha a revisión antes de publicarla.", link_unavailable: "El enlace no está disponible. Solicita uno nuevo.", rate_limited: "Se han realizado varios intentos. Espera antes de reintentar.", invalid_body: "Revisa los campos y sus límites antes de guardar.", not_found: "El recurso no está disponible o la función está desactivada." };
export function StaffError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return <div role="alert" className="notice error"><p>{error instanceof ApiError ? messages[error.code] || "No se pudo completar la operación. Revisa los datos y vuelve a intentar." : "El servicio no está disponible. Vuelve a intentar."}</p>{retry && <button className="secondary" onClick={retry}>Reintentar</button>}</div>;
}
export function DataTable({ headings, children }: { headings: string[]; children: ReactNode }) { return <div className="table-scroll" tabIndex={0} aria-label="Tabla desplazable"><table><thead><tr>{headings.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
export const time = (value?: string | null) => value ? new Date(value).toLocaleString("es") : "Sin registro";
