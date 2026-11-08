import { AccountPrivacy } from "../../../src/components/account-privacy";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <AccountPrivacy marketingEnabled={process.env.FEATURE_ENABLE_MARKETING === "true"} sharingEnabled={process.env.FEATURE_ENABLE_PARTNER_SHARING === "true"} />; }
