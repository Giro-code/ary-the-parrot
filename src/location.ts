// Render only location data already supplied by a published record. Never generate a map URL.
export function locationText(value: unknown): string | null {
  if (typeof value === "string") return value.slice(0, 280);
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.address === "string") return row.address.slice(0, 280);
  if (typeof row.label === "string") return row.label.slice(0, 280);
  if (typeof row.lat === "number" && typeof row.lng === "number" && Math.abs(row.lat) <= 90 && Math.abs(row.lng) <= 180) return `${row.lat}, ${row.lng}`;
  return null;
}
