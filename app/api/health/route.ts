import { version } from "../../../package.json";
import { getConnection } from "../../../src/db/client";
import { sql } from "drizzle-orm";
import { AppError } from "../../../src/server/errors";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "unavailable", error: string | null = null;
  try {
    const connection = await getConnection();
    await connection.db.execute(sql`select 1`);
    await connection.db.execute(sql`select id from visitor_sessions limit 1`);
    await connection.db.execute(sql`select id from ai_usage limit 1`);
    database = connection.mode === "pglite" ? "local_pglite" : "connected";
  } catch (cause) { error = cause instanceof AppError ? cause.code : "database_unavailable"; database = error === "database_not_configured" ? "not_configured" : "unavailable"; }
  const checks = {
    database,
    email: process.env.EMAIL_DRY_RUN !== "false"
      ? "dry_run"
      : process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()
        ? "configured_unverified"
        : "not_configured",
    ai: process.env.GEMINI_API_KEY?.trim()
      ? "configured_unverified"
      : "demo",
    robot: "simulator",
  };

  return Response.json(
    { status: error ? "degraded" : "ok", version, time: new Date().toISOString(), checks, ...(error ? { error, message: error, requestId: randomUUID() } : {}) },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
