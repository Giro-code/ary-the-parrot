import { kioskLocale } from "../../src/i18n";
import { Kiosk } from "../../src/components/kiosk";
import { offlineImageAvailable } from "../../src/server/ary-assets";
export const dynamic = "force-dynamic";
export default function KioskPage() { return <Kiosk defaultLocale={kioskLocale(process.env.KIOSK_DEFAULT_LOCALE)} offlineImageAvailable={offlineImageAvailable()} />; }
