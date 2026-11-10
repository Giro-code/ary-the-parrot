import { Information } from "../../src/components/information";
import { sessionTtl } from "../../src/server/config";
import { conversationRetentionDays } from "../../src/server/conversations";
export const dynamic = "force-dynamic";
export default function PrivacyPage() { return <Information kind="privacy" hours={sessionTtl() / 3600_000} retentionDays={conversationRetentionDays()} />; }
