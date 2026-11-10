import { requestLocale } from "../../src/server/locale";
import { Recovery } from "../../src/components/recovery";
export default async function RecoveryPage() {
  return <Recovery initialLocale={await requestLocale()} marketingEnabled={process.env.FEATURE_ENABLE_MARKETING === "true"} />;
}
