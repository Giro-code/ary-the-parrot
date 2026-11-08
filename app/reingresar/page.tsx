import { Recovery } from "../../src/components/recovery";
export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <Recovery initialLocale={(await searchParams).lang === "en" ? "en" : "es"} marketingEnabled={process.env.FEATURE_ENABLE_MARKETING === "true"} development={process.env.NODE_ENV !== "production"} />;
}
