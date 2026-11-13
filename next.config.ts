import type { NextConfig } from "next";

const development = process.env.NODE_ENV === "development";
// The original brochure has an inline print handler and embedded styles.
// Next.js also emits inline bootstrap scripts on App Router pages.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  `connect-src 'self'${development ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const config: NextConfig = {
  poweredByHeader: false,
  // QR/activation paths contain temporary secrets. Never print incoming URLs.
  logging: { incomingRequests: false, browserToTerminal: false },
  async redirects() {
    return [{ source: "/mi-viaje", destination: "/mi-cultura", permanent: true }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/favicon.ico", destination: "/site/favicon.svg" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }, {
      source: "/kiosco",
      headers: [{ key: "Content-Security-Policy", value: csp.replace(/connect-src [^;]+/, `connect-src 'self' http://127.0.0.1:8765 http://127.0.0.1:8766 ws://127.0.0.1:8765${development ? " ws: wss:" : ""}`) }, { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" }],
    }, {
      source: "/experiencia",
      headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" }],
    }, {
      source: "/q/:path*",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }, {
      source: "/admin/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }, {
      source: "/partner/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }, {
      source: "/auth/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }, {
      source: "/email/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }, {
      source: "/dev/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }, {
      source: "/kiosco/activar",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }];
  },
};

export default config;
