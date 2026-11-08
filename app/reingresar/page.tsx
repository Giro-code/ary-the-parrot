import { Information } from "../../src/components/information";
export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <Information kind="recovery" initialLocale={(await searchParams).lang === "en" ? "en" : "es"} />;
}
