import { VerifyLink } from "../../../src/components/verify-link";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { return <VerifyLink token={(await searchParams).token || ""} kind="unsubscribe" />; }
