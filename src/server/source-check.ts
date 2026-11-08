import { lookup } from "node:dns/promises";
import type { LookupAddress, LookupAllOptions } from "node:dns";
import { request } from "node:https";
import { isIP } from "node:net";
import { AppError } from "./errors.ts";

// Conservative public-address allowlist, including IPv4-mapped IPv6 and reserved ranges.
export function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 2, 168].includes(b)) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
  }
  // Only globally routed IPv6; excludes mapped addresses, loopback, ULA, link local, multicast.
  return isIP(address) === 6 && /^[23]/i.test(address) && !address.toLowerCase().startsWith("2001:db8:") && !address.toLowerCase().startsWith("2001:0:") && !address.toLowerCase().startsWith("2002:");
}
export function sourceUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new AppError("source_blocked", 400); }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || (isIP(host) && !publicAddress(host))) throw new AppError("source_blocked", 400);
  return url;
}
export async function checkSource(raw: string, resolve: (hostname: string, options: LookupAllOptions) => Promise<LookupAddress[]> = lookup): Promise<Date> {
  const url = sourceUrl(raw), host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await Promise.race([resolve(host, { all: true, verbatim: true }), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new AppError("source_timeout", 422)), 5000); timer.unref(); })]);
  if (!addresses.length || addresses.some(row => !publicAddress(row.address))) throw new AppError("source_blocked", 400);
  const pinned = addresses[0];
  // Connect to the validated DNS result; TLS still verifies the original hostname.
  // Redirects are deliberately rejected, never followed into a private network.
  await new Promise<void>((resolve, reject) => {
    const req = request(url, { method: "HEAD", lookup: (_hostname, options, callback) => options.all ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family) }, response => {
      response.destroy();
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) resolve();
      else reject(new AppError("source_not_verified", 422));
    });
    const timer = setTimeout(() => req.destroy(new AppError("source_timeout", 422)), 5000);
    req.once("close", () => clearTimeout(timer));
    req.once("error", () => reject(new AppError("source_not_verified", 422)));
    req.end();
  });
  return new Date();
}
