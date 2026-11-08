import { version } from "../../../package.json";

export const dynamic = "force-dynamic";

export function GET() {
  // These values describe configuration only. No upstream service is contacted.
  const checks = {
    database: process.env.DATABASE_URL?.trim() ? "configured_unverified" : "not_configured",
    email: process.env.EMAIL_DRY_RUN !== "false"
      ? "dry_run"
      : process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()
        ? "configured_unverified"
        : "not_configured",
    ai: process.env.AI_GATEWAY_API_KEY?.trim() && process.env.AI_MODEL?.trim()
      ? "configured_unverified"
      : "demo",
    robot: "simulator",
  };

  return Response.json(
    { status: "ok", version, time: new Date().toISOString(), checks },
    { headers: { "Cache-Control": "no-store" } },
  );
}
