import { StaffLogin } from "../../../src/components/staff-login";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { return <StaffLogin token={(await searchParams).token} />; }
