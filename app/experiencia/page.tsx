export const dynamic = "force-dynamic";
import { Experience } from "../../src/components/experience";
import { offlineImageAvailable } from "../../src/server/ary-assets";
export default function ExperiencePage() { return <Experience sharingEnabled={process.env.FEATURE_ENABLE_PARTNER_SHARING === "true"} offlineImageAvailable={offlineImageAvailable()} />; }
