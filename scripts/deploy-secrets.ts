import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync, constants } from "node:fs";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { generatedSecrets, ownerVariables, productionDefaults } from "../src/server/config.ts";

export function generateSecrets(filename = ".env.production.local", force = false, log: (message: string) => void = console.log) {
  if (existsSync(filename) && !force) { log("El archivo ya existe; no se sobrescribe. Usa --force para guardar una copia privada .bak y regenerar."); return false; }
  if (existsSync(filename)) copyFileSync(filename, `${filename}.bak.${Date.now()}.${randomBytes(4).toString("hex")}`, constants.COPYFILE_EXCL);
  const values: Record<string, string> = { ...productionDefaults };
  for (const name of generatedSecrets) values[name] = randomBytes(48).toString("base64url");
  for (const name of ownerVariables) values[name] = "";
  const content = "# PRIVADO: importar solo en Vercel Production. No compartir ni versionar.\n"
    + Object.entries(values).map(([name, value]) => `${ownerVariables.includes(name as typeof ownerVariables[number]) ? "# Completar en un editor privado: " + name + "\n" : ""}${name}=${value}`).join("\n") + "\n";
  writeFileSync(filename, content, { mode: 0o600, flag: force ? "w" : "wx" });
  // Parse the file we wrote; report names only, including missing owner input.
  for (const [name, value] of Object.entries(parseEnv(readFileSync(filename, "utf8")))) log(`${name}: ${value ? "OK" : "falta"}`);
  return true;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { generateSecrets(undefined, process.argv.includes("--force")); }
  catch { console.error("No se pudo generar el archivo privado; detalles omitidos."); process.exitCode = 1; }
}
