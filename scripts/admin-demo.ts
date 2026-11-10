import { z } from "zod";
import { connectDatabase } from "../src/db/client.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { resetDemo, seedDemo } from "../src/db/demo.ts";
import { requestStaffLink, roles } from "../src/server/staff.ts";
import { hashToken, newToken } from "../src/server/tokens.ts";
import { assertDemoAllowed, loadCliEnv, option } from "./cli-env.ts";
import { bootstrapAdmin } from "./admin-bootstrap.ts";
import { validSecret } from "../src/server/config.ts";
let conn: Awaited<ReturnType<typeof connectDatabase>> | undefined;
try {
  loadCliEnv();
  // This CLI never sends real mail, regardless of the file's mail setting.
  process.env.EMAIL_DRY_RUN = "true";
  const command = process.argv[2];
  if (!["demo:seed", "demo:reset", "admin:create"].includes(command)) throw new Error("Invalid command");
  if (command.startsWith("demo:")) assertDemoAllowed(process.argv);
  const printLink = process.argv.includes("--print-link");
  if (printLink && !process.stdout.isTTY) {
    console.error("--print-link requiere la terminal interactiva privada del propietario; no admite capturas ni redirección.");
    throw new Error("Local interactive terminal required");
  }
  if (command === "admin:create" && process.env.NODE_ENV === "production" && !printLink) {
    console.error("Producción: usa --print-link en tu terminal local privada; /dev/outbox devuelve 404 y este CLI no envía correo.");
    throw new Error("Local bootstrap required");
  }
  if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL?.trim() || !validSecret(process.env.AUTH_SECRET) || !validSecret(process.env.SESSION_ENCRYPTION_KEY))) throw new Error("Production configuration required");
  // Validate arguments before creating a connection or applying migrations.
  const args = process.argv.slice(3);
  const admin = command === "admin:create" ? { email: z.email().parse(option(args, "email")), name: z.string().trim().min(1).max(200).parse(option(args, "org")), role: z.enum(roles).parse(option(args, "role")) } : undefined;
  conn = await connectDatabase();
  await migrateDatabase(conn.db);
  if (command === "demo:seed") { await seedDemo(conn.db); console.log("DEMO: fictitious organizations, offers, @example.invalid staff and synthetic aggregates ready. No mail sent."); }
  else if (command === "demo:reset") { await resetDemo(conn.db); console.log("DEMO namespace reset. Other organizations and cultural seed preserved."); }
  else if (command === "admin:create") {
    const link = await bootstrapAdmin(conn.db, admin!.email, admin!.name, admin!.role, printLink);
    if (link) {
      console.warn("PRIVADO: enlace de acceso de un uso, 15 minutos. No compartir, capturar, redirigir ni registrar esta terminal. Evita PowerShell Transcript. No se envió correo.");
      console.log(link); // Explicit --print-link + local interactive terminal only.
    } else {
      await requestStaffLink(conn.db, admin!.email, hashToken(newToken()));
      console.log("Organization and membership created. Open /dev/outbox locally for test access. No mail sent.");
    }
  } else throw new Error("Invalid command");
} catch (error) {
  console.error(error instanceof Error && error.message === "Production demo blocked"
    ? "Demo bloqueada fuera de local, antes de conectar. Revisa APP_BASE_URL; no uses identidades de demo en producción."
    : "Admin/demo command failed. Check arguments, configuration and migrations; sensitive details omitted.");
  process.exitCode = 1;
}
finally { if (conn) { try { await conn.close(); } catch { console.error("Database close failed; sensitive details omitted."); process.exitCode = 1; } } }
