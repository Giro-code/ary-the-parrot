import { Kiosk } from "../../src/components/kiosk";
import { offlineImageAvailable } from "../../src/server/ary-assets";
export const dynamic = "force-dynamic";
export default function KioskPage() { return <Kiosk offlineImageAvailable={offlineImageAvailable()} />; }
