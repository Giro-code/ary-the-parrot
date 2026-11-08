import { Activation } from "../../../src/components/activation";
export const dynamic = "force-dynamic";
export default async function ActivationPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <Activation code={code && /^[\w-]{43}$/.test(code) ? code : ""} />;
}
