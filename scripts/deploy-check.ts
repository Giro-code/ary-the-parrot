import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { secretVariables, validateProductionConfig, type ConfigCheck } from "../src/server/config.ts";
import { option } from "./cli-env.ts";

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function files(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isSymbolicLink() ? [] : entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)]);
}
export function checkDeployment(env: Record<string, string | undefined>, root = process.cwd()): ConfigCheck[] {
  const checks = validateProductionConfig(env);
  const add = (name: string, ok: boolean) => checks.push({ name, status: ok ? "OK" : "formato inválido", required: true });
  const secrets = secretVariables.flatMap(name => env[name]?.trim() ? [{ name, value: env[name]!, hash: digest(env[name]!) }] : []);
  for (const [name, value] of Object.entries(env).filter(([name]) => name.startsWith("NEXT_PUBLIC_"))) {
    // Inspect all NEXT_PUBLIC values, including aliases and URLs that contain a key.
    const namedSecret = /SECRET|PASSWORD|TOKEN|API_KEY|DATABASE_URL|ENCRYPTION|RATE_LIMIT_SALT/i.test(name);
    add(name, !namedSecret && !secrets.some(secret => !!value && (value.includes(secret.value) || value.includes(secret.hash))));
  }
  for (const folder of ["public", ".next/static"]) {
    const exposed = new Set<string>();
    for (const file of files(join(root, folder))) {
      const content = readFileSync(file);
      for (const secret of secrets) {
        // Locate privately, then verify the candidate's SHA-256 fingerprint. Never emit
        // source text, matched bytes, values, hashes, paths or arbitrary parser errors.
        const offset = content.indexOf(Buffer.from(secret.value));
        if (content.includes(Buffer.from(secret.hash)) || offset >= 0 && digest(content.subarray(offset, offset + Buffer.byteLength(secret.value))) === secret.hash) exposed.add(secret.name);
      }
    }
    add(`${folder}: exposición`, exposed.size === 0);
    for (const name of exposed) add(`${folder}: ${name}`, false);
  }
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  add("engines.node", pkg.engines?.node === "24.x");
  const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  const crons = vercel.crons;
  add("vercel.crons", Array.isArray(crons) && crons.length === 2 && crons.length <= 100 && new Set(crons.map(c => c.path)).size === crons.length
    && crons.every(c => typeof c.schedule === "string" && /^(?:[0-9]|[1-5][0-9]) (?:[0-9]|1[0-9]|2[0-3]) \* \* \*$/.test(c.schedule))
    && ["/api/internal/email-dispatch", "/api/internal/cleanup"].every(path => crons.some(c => c.path === path)));
  add("vercel.regions", JSON.stringify(vercel.regions) === JSON.stringify(["iad1"]));
  return checks;
}
export function runDeployCheck(args = process.argv.slice(2), root = process.cwd(), log: (message: string) => void = console.log) {
  try {
    const filename = option(args, "env-file") || ".env.production.local";
    // No .env.local or inherited private configuration is loaded.
    const env = parseEnv(readFileSync(resolve(root, filename), "utf8"));
    const publicEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("NEXT_PUBLIC_")));
    const rows = checkDeployment({ ...publicEnv, ...env }, root);
    log("Nombre | Estado | Obligatoria");
    for (const row of rows) log(`${row.name} | ${row.status} | ${row.required ? "sí" : "no"}`);
    if (!existsSync(join(root, ".next/static"))) log("Sin build: falta comprobar .next/static tras compilar.");
    log("Validación local de formato; no verifica credenciales, DNS ni proveedores.");
    return rows.some(row => row.status !== "OK" && (row.required || row.status === "formato inválido")) ? 1 : 0;
  } catch { log("Comprobación fallida: archivo ausente, ilegible o configuración inválida; detalles privados omitidos."); return 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = runDeployCheck();
