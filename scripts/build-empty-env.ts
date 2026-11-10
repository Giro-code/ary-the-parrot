// Reproduce the normal build from an isolated copy without reading/moving private
// env files. No alternative bundler, worker flags, or sandbox-specific Next config.
import { cpSync, mkdirSync, mkdtempSync, symlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
const root = process.cwd();
mkdirSync(join(root, ".cache"), { recursive: true });
const directory = mkdtempSync(join(root, ".cache", "stage5-build-"));
for (const name of ["app", "src", "public", "drizzle", "scripts", "tests", "docs", "legacy", "package.json", "package-lock.json", "next.config.ts", "next-env.d.ts", "tsconfig.json", "vercel.json", "vitest.config.ts", "playwright.config.ts"]) {
  cpSync(join(root, name), join(directory, name), { recursive: true });
}
symlinkSync(resolve(root, "node_modules"), join(directory, "node_modules"), process.platform === "win32" ? "junction" : "dir");
const env: NodeJS.ProcessEnv = { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "PATHEXT"]) if (process.env[name]) env[name] = process.env[name];
console.log("Build normal en copia aislada, sin archivos .env ni configuración privada heredada. Artefacto en .cache/stage5-build-*/.next.");
const command = process.env.npm_execpath ? [process.env.npm_execpath, "run", "build"] : [join(directory, "node_modules/next/dist/bin/next"), "build"];
const child = spawn(process.execPath, command, { cwd: directory, env, stdio: "inherit" });
child.on("error", error => { console.error(`Build could not start: ${(error as NodeJS.ErrnoException).code || "unknown"}`); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
