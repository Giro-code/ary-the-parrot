export const dynamic = "force-dynamic";
import { Trip } from "../../src/components/trip";
export default function CulturePage() { return <Trip sharingEnabled={process.env.FEATURE_ENABLE_PARTNER_SHARING === "true"} />; }
