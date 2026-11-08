export const dynamic = "force-dynamic";
import { Experience } from "../../src/components/experience";
export default function ExperiencePage() { return <Experience sharingEnabled={process.env.FEATURE_ENABLE_PARTNER_SHARING === "true"} />; }
