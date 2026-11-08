import { getConnection } from "../../../src/db/client";
import { previewHandoff } from "../../../src/server/service";
import { AppError } from "../../../src/server/errors";
import { Redeem } from "../../../src/components/redeem";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ary · Continuar experiencia", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function RedeemPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let preview, initialError;
  try {
    const { db } = await getConnection();
    preview = await previewHandoff(db, token);
  } catch (error) { initialError = error instanceof AppError ? error.code : "service_unavailable"; }
  return <Redeem token={preview ? token : ""} code={preview?.confirmationCode} initialLocale={preview?.locale || "es"} initialError={initialError} />;
}
