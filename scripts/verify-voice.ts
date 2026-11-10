// Explicit live integration check: <= 4 provider requests across ALL stage6 runs.
// Synthetic public speech only. No production DB, emails, visitor recording or secret output.
import nextEnv from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { connectDatabase } from "../src/db/client.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { seedDatabase, type SourceCheck } from "../src/db/seed.ts";
import { createSession } from "../src/server/service.ts";
import { chat } from "../src/server/ai/chat.ts";
import { synthesize, defaultTtsModel, defaultTtsVoice } from "../src/server/ai/voice.ts";
import { AiError } from "../src/server/ai/providers.ts";
import { aiUsage } from "../src/db/schema.ts";

if (!process.argv.includes("--live")) throw new Error("Requires an explicitly authorized --live check.");
// Preserve prior attempts and enforce the owner's cumulative stage budget before
// loading credentials, opening a DB or making any network request.
let usedCalls = 0;
for (const name of ["live-voice-attempt-1.json", "live-voice.json"]) {
  try {
    const evidence = JSON.parse(await readFile(`docs/evidence/stage6/${name}`, "utf8"));
    if (!Number.isInteger(evidence.calls) || evidence.calls < 0) throw new Error("Invalid voice call ledger.");
    usedCalls += evidence.calls;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
if (usedCalls + 3 > 4) throw new Error(`Stage6 call budget: ${usedCalls}/4 already used; this three-request check is disabled.`);
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const report: { measuredAt: string; scope: string; calls: number; voice: string; ttsModel: string; stages: { stage: string; ms: number; ok: boolean; errorCode?: string }[]; formats: { mimeType: string; encodedBytes: number }[]; questionToWavMs?: number } = { measuredAt: new Date().toISOString(), scope: "Synthetic Spanish voice; server pipeline in memory; excludes capture/upload/browser playback/hardware", calls: 0, voice: process.env.AI_TTS_VOICE || defaultTtsVoice, ttsModel: process.env.AI_TTS_MODEL || defaultTtsModel, stages: [], formats: [] };
const output = "docs/evidence/stage6";
await mkdir(output, { recursive: true });
if (!process.env.GEMINI_API_KEY?.trim()) { report.stages.push({ stage: "configuration", ms: 0, ok: false, errorCode: "missing_key" }); }
else {
  const connection = await connectDatabase({ memory: true });
  let started = Date.now();
  try {
    await migrateDatabase(connection.db);
    await seedDatabase(connection.db, JSON.parse(await readFile("docs/evidence/stage2/seed-sources.json", "utf8")) as SourceCheck[]);
    const visitor = await createSession(connection.db);
    started = Date.now(); report.calls++;
    const input = await synthesize("Cuéntame sobre el merengue de República Dominicana.", format => report.formats.push(format));
    report.stages.push({ stage: "tts-voice-sample", ms: Date.now() - started, ok: true });
    await writeFile(`${output}/synthetic-question.wav`, input.wav);
    const questionAt = Date.now(); started = questionAt; report.calls++;
    const reply = await chat(connection.db, visitor.token, undefined, { bytes: input.wav, mimeType: "audio/wav" });
    const usage = await connection.db.select().from(aiUsage);
    const valid = reply.mode === "gemini" && !!reply.transcript;
    report.stages.push({ stage: "audio-to-validated-reply", ms: Date.now() - started, ok: valid, ...(usage.at(-1)?.errorCode ? { errorCode: usage.at(-1)!.errorCode! } : {}) });
    if (!valid) process.exitCode = 1;
    started = Date.now(); report.calls++;
    const answer = await synthesize(reply.spokenText, format => report.formats.push(format));
    report.stages.push({ stage: "reply-tts", ms: Date.now() - started, ok: true });
    report.questionToWavMs = Date.now() - questionAt;
    await writeFile(`${output}/synthetic-ary-reply.wav`, answer.wav);
  } catch (error) {
    report.stages.push({ stage: "integration-stopped", ms: Date.now() - started, ok: false, errorCode: error instanceof AiError ? error.code : "voice_check_failed" });
    process.exitCode = 1;
  } finally { await connection.close(); }
}
await writeFile(`${output}/live-voice.json`, JSON.stringify(report, null, 2) + "\n");
// Metadata only: never provider response bodies, keys, cookies, transcript or environment dumps.
console.log(JSON.stringify(report));
