export const dynamic = "force-dynamic";
import { Experience } from "../../src/components/experience";
import { offlineImageAvailable } from "../../src/server/ary-assets";
import { isDryRun } from "../../src/server/email/providers";
export default function ExperiencePage() { return <Experience dryRun={isDryRun()} sharingEnabled={process.env.FEATURE_ENABLE_PARTNER_SHARING === "true"} offlineImageAvailable={offlineImageAvailable()} />; }
