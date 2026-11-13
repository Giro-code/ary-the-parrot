// Crea un kiosco "Ari Raspberry" y lo activa en el acto, sin correo ni código.
// Solo escribe la credencial por stdout para que scripts/activate-pi.ps1 la envíe por SSH a la Pi (archivo 0600).
// Ejecutar únicamente desde la terminal del propietario: usa la base de datos de producción.
import { getConnection } from "../src/db/client.ts";
import { activateKiosk, enrollKiosk } from "../src/server/service.ts";

const { db } = await getConnection();
const { code } = await enrollKiosk(db, "Ari Raspberry (sin pantalla)");
const token = await activateKiosk(db, code);
process.stdout.write(JSON.stringify({ ary_kiosk: token, activatedAt: Math.floor(Date.now() / 1000) }));
process.exit(0);
