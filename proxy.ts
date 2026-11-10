import { NextRequest, NextResponse } from "next/server";
import { decideLocale, LANGUAGE_COOKIE, LANGUAGE_MAX_AGE, supportedLocale } from "./src/i18n/language";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone(), path = url.pathname;
  const choice = supportedLocale(url.searchParams.get("lang"));
  let response: NextResponse;
  if (choice && (request.method === "GET" || request.method === "HEAD")) {
    url.searchParams.delete("lang");
    // Explicit English paths must also allow switching back to Spanish.
    if (choice === "es" && path === "/en/index.html") url.pathname = "/index.html";
    if (choice === "es" && path === "/en/brochure.html") url.pathname = "/brochure.html";
    response = NextResponse.redirect(url, 307);
    response.cookies.set(LANGUAGE_COOKIE, choice, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: LANGUAGE_MAX_AGE });
  } else {
    const locale = decideLocale({ cookie: request.cookies.get(LANGUAGE_COOKIE)?.value, country: request.headers.get("x-vercel-ip-country"), acceptLanguage: request.headers.get("accept-language") });
    const h = new Headers(request.headers);
    h.set("x-ary-kiosk", path === "/kiosco" ? "1" : "0");
    h.set("x-ary-phone", path.startsWith("/q/") ? "1" : "0");
    const target = path === "/" || path === "/index.html" ? `${locale === "en" ? "/en" : ""}/index.html`
      : path === "/brochure.html" ? `${locale === "en" ? "/en" : ""}/brochure.html` : null;
    // Rewrite only when the target differs; rewriting a file to itself loops through the proxy.
    // Build from request.url so the internal fetch keeps the real host (not "localhost").
    if (target && target !== path) response = NextResponse.rewrite(new URL(target + url.search, request.url), { request: { headers: h } });
    else response = NextResponse.next({ request: { headers: h } });
  }
  response.headers.set("Vary", "Cookie, Accept-Language");
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  return response;
}
// API routes set their own cache headers; never touch them here.
export const config = { matcher: ["/((?!api/|_next/|site/|assets/|favicon.ico).*)"] };
