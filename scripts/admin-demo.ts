import nextEnv from "@next/env";
import { z } from "zod";
import { connectDatabase } from "../src/db/client.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { resetDemo, seedDemo } from "../src/db/demo.ts";
import { audit, createMembership, requestStaffLink, roles } from "../src/server/staff.ts";
import { organizations } from "../src/db/schema.ts";
import { hashToken, newToken } from "../src/server/tokens.ts";
nextEnv.loadEnvConfig(process.cwd());
// This CLI never sends real mail, regardless of local mail configuration.
process.env.EMAIL_DRY_RUN = "true";
const conn = await connectDatabase();
try {
  await migrateDatabase(conn.db);
  const command = process.argv[2];
  if (command === "demo:seed") { await seedDemo(conn.db); console.log("DEMO: fictitious organizations, offers, @example.invalid staff and synthetic aggregates ready. No mail sent."); }
  else if (command === "demo:reset") { await resetDemo(conn.db); console.log("DEMO namespace reset. Other organizations and cultural seed preserved."); }
  else if (command === "admin:create") {
    const arg = (key: string) => { const i = process.argv.indexOf(`--${key}`); return i < 0 ? undefined : process.argv[i + 1]; };
    const email = z.email().parse(arg("email")), name = z.string().trim().min(1).max(200).parse(arg("org")), role = z.enum(roles).parse(arg("role"));
    await conn.db.transaction(async tx => { const [org] = await tx.insert(organizations).values({ name, kind: "admin" }).returning(); const member = await createMembership(tx, email, org.id, role); await audit(tx, { userId: member.userId, organizationId: org.id, role }, "staff.bootstrap", "membership", member.id); });
    if (process.env.NODE_ENV !== "production") await requestStaffLink(conn.db, email, hashToken(newToken()));
    console.log("Organization and membership created. In development, open /dev/outbox for the test access link. No credentials printed or mail sent.");
  } else throw new Error("Invalid command");
} catch { console.error("Admin/demo command failed. Check arguments, configuration and migrations; sensitive details omitted."); process.exitCode = 1; }
finally { await conn.close(); }
