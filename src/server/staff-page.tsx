import Link from "next/link";
import { cookies } from "next/headers";
import { getConnection } from "../db/client";
import { AppError } from "./errors";
import { audit, operators, partners, readers, requireStaff, roles, staffMemberships, type Staff } from "./staff";
import { StaffShell } from "../components/staff-shared";
import { StaffOverview } from "../components/staff-overview";
import { AdminWorkspace } from "../components/admin-workspace";
import { PartnerWorkspace } from "../components/partner-workspace";
const titles: Record<string, string> = { "": "Analítica agregada", dispositivos: "Dispositivos", contenidos: "Contenidos culturales", catalogo: "Catálogo", organizaciones: "Organizaciones y membresías", campanas: "Campañas", solicitudes: "Solicitudes B2B", privacidad: "Solicitudes de borrado", ofertas: "Ofertas y experiencias", leads: "Solicitudes consentidas" };
export async function StaffPage({ section, partner, organizationId }: { section: string; partner?: boolean; organizationId?: string }) {
  let staff: Staff | undefined, memberships: Awaited<ReturnType<typeof staffMemberships>> = [], failure: unknown;
  try {
    const { db } = await getConnection(), token = (await cookies()).get("ary_staff")?.value;
    const allowed = partner ? partners : section === "organizaciones" ? ["superadmin"] as const : ["", "dispositivos"].includes(section) ? readers : operators;
    staff = await requireStaff({ db, token, roles: allowed, organizationId: partner ? organizationId : undefined });
    await audit(db, staff, "staff.page", partner ? "partner_page" : "admin_page", undefined, { section });
    memberships = partner ? (await staffMemberships(db, staff)).filter(row => partners.includes(row.role as typeof roles[number])) : [];
  } catch (error) { failure = error; }
  if (!staff || failure) return <div className="ary-app"><main><h1>Acceso restringido</h1><p>{failure instanceof AppError && failure.status === 403 ? "Tu membresía no permite consultar esta página u organización." : failure instanceof AppError && failure.status === 401 ? "Entra con tu enlace de acceso de personal." : "El servicio no está disponible. Reintenta más tarde."}</p><Link href="/admin/entrar">Acceso del personal</Link></main></div>;
    const org = partner ? staff.organizationId : undefined;
    return <StaffShell title={partner && !section ? "Resumen de proveedor" : titles[section] || "Página no disponible"} partner={partner} organizationId={org} role={staff.role}>{partner && <form className="staff-toolbar" action={`/partner/${section}`}><label>Organización<select name="organizationId" defaultValue={org}>{memberships.map(row => <option key={row.organizationId} value={row.organizationId}>{row.name}</option>)}</select></label><button>Cambiar organización</button></form>}{!section ? <StaffOverview organizationId={org} /> : partner ? <PartnerWorkspace section={section} organizationId={staff.organizationId} role={staff.role} sharingEnabled={process.env.FEATURE_ENABLE_PARTNER_SHARING === "true"} /> : <AdminWorkspace section={section} role={staff.role} marketingEnabled={process.env.FEATURE_ENABLE_MARKETING === "true"} />}</StaffShell>;
}
