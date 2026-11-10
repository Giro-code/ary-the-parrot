import { existsSync } from "node:fs";
import { join } from "node:path";
export const offlineImageAvailable = () => existsSync(join(process.cwd(), "public/assets/ary/ary-sin-conexion.webp"));
