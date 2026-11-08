import { readFile, mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import vm from "node:vm";
const context = {};
vm.runInNewContext(await readFile(".next/server/app/kiosco/page_client-reference-manifest.js", "utf8"), context);
const manifest = context.__RSC_MANIFEST["/kiosco/page"];
const entries = Object.entries(manifest.clientModules).filter(([name]) => name.startsWith("[project]/src/"));
const chunkPaths = [...new Set(entries.flatMap(([, module]) => module.chunks))].filter(path => path.endsWith(".js"));
if (!chunkPaths.length) throw new Error("No kiosk client chunks found; a compiled build is required.");
const chunks = await Promise.all(chunkPaths.map(async url => {
  const buffer = await readFile(`.next/${url.replace(/^\/?_next\//, "")}`);
  return { url, bytes: buffer.length, gzipBytes: gzipSync(buffer).length };
}));
const gzipBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
const report = { measuredAt: new Date().toISOString(), scope: "Compiled client-entry chunks (including shared dependencies); excludes Next bootstrap. Does not certify complete build or browser performance.", budgetBytes: 200 * 1024, gzipBytes, passes: gzipBytes <= 200 * 1024, chunks };
await mkdir("docs/evidence/stage2", { recursive: true });
await writeFile("docs/evidence/stage2/kiosk-budget.json", JSON.stringify(report, null, 2) + "\n");
console.log(`Kiosk client-entry chunks: ${gzipBytes} bytes gzip / ${report.budgetBytes}; ${report.passes ? "PASS" : "FAIL"} (compiled assets only).`);
if (!report.passes) process.exitCode = 1;
