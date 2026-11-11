// Render verified record data. Map links are built only from validated record coordinates.
export type PlaceLocation = { label: string; lat: number; lng: number; mapsQuery: string };
export function mapsUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const { lat, lng } = value as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
export function locationText(value: unknown): string | null {
  if (typeof value === "string") return value.slice(0, 280);
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.address === "string") return row.address.slice(0, 280);
  if (typeof row.label === "string") return row.label.slice(0, 280);
  if (mapsUrl(value)) return `${row.lat}, ${row.lng}`;
  return null;
}
