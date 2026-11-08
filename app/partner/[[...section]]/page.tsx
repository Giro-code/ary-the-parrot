import { StaffPage } from "../../../src/server/staff-page";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ organizationId?: string }> }) { return <StaffPage partner section={(await params).section?.join("/") || ""} organizationId={(await searchParams).organizationId} />; }
