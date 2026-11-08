import { StaffPage } from "../../../src/server/staff-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) { return <StaffPage section={(await params).section?.join("/") || ""} />; }
