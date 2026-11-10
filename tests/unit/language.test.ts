import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { acceptedLanguages, decideLocale, detectedLocale, kioskLocale, phoneLocale, SPANISH_SPEAKING_COUNTRIES, SUPPORTED_LANGUAGES } from "../../src/i18n";
import { proxy } from "../../proxy";

describe("language policy", () => {
  test("only two languages and the full agreed country list", () => {
    expect(Object.keys(SUPPORTED_LANGUAGES)).toEqual(["en", "es"]);
    expect(SPANISH_SPEAKING_COUNTRIES.join(" ")).toBe("ES MX GT HN SV NI CR PA CU DO PR CO VE EC PE BO PY CL AR UY GQ");
    for (const country of SPANISH_SPEAKING_COUNTRIES) expect(decideLocale({ country })).toBe("es");
  });
  test("explicit choice wins; a known non-Spanish country uses English", () => {
    expect(decideLocale({ cookie: "en", country: "MX", acceptLanguage: "es" })).toBe("en");
    expect(decideLocale({ cookie: "es", country: "US" })).toBe("es");
    expect(decideLocale({ cookie: "fr", country: "US", acceptLanguage: "es" })).toBe("en");
    expect(decideLocale({ country: " mx " })).toBe("es");
  });
  test("without country, negotiate supported languages by quality; fallback English", () => {
    expect(decideLocale({ acceptLanguage: "fr-FR,es-BO;q=.9,en;q=.8" })).toBe("es");
    expect(decideLocale({ acceptLanguage: "es;q=0,en;q=.9" })).toBe("en");
    expect(decideLocale({ acceptLanguage: "es;q=bad,en;q=.5" })).toBe("en");
    expect(decideLocale({ acceptLanguage: "fr" })).toBe("en");
    expect(decideLocale({})).toBe("en");
  });
  test.each([["es", "es"], ["en", "en"], ["other", "en"]] as const)("detected %s changes locale to %s", (detected, expected) => expect(detectedLocale(detected)).toBe(expected));
  test("phone follows its first browser language and the explicit cookie", () => {
    expect(phoneLocale(undefined, acceptedLanguages("es-ES,en;q=.8"))).toBe("es");
    expect(phoneLocale(undefined, ["en-US", "es-ES"])).toBe("en");
    expect(phoneLocale(undefined, ["fr-FR", "es-ES"])).toBe("en");
    expect(phoneLocale("en", ["es-ES"])).toBe("en");
    expect(phoneLocale("es", ["en-US"])).toBe("es");
    expect(kioskLocale()).toBe("en"); expect(kioskLocale("invalid")).toBe("en");
  });
});
test("proxy rewrites static pages, strips spoofed surface headers and prevents shared caching", () => {
  const en = proxy(new NextRequest("http://localhost/", { headers: { "x-vercel-ip-country": "US" } }));
  expect(en.headers.get("x-middleware-rewrite")).toBe("http://localhost/en/index.html");
  expect(en.headers.get("vary")).toBe("Cookie, Accept-Language");
  expect(en.headers.get("cache-control")).toContain("no-store");
  expect(en.headers.get("cdn-cache-control")).toBe("no-store");
  // Rewriting a file to itself loops through the proxy in production; it must pass through untouched.
  const es = proxy(new NextRequest("http://localhost/brochure.html", { headers: { "x-vercel-ip-country": "MX" } }));
  expect(es.headers.get("x-middleware-rewrite")).toBeNull();
  const root = proxy(new NextRequest("http://localhost/", { headers: { "x-vercel-ip-country": "MX" } }));
  expect(root.headers.get("x-middleware-rewrite")).toBe("http://localhost/index.html");
  const enBrochure = proxy(new NextRequest("http://localhost/brochure.html", { headers: { "x-vercel-ip-country": "US" } }));
  expect(enBrochure.headers.get("x-middleware-rewrite")).toBe("http://localhost/en/brochure.html");
  const kiosk = proxy(new NextRequest("http://localhost/kiosco", { headers: { "x-ary-phone": "1" } }));
  expect(kiosk.headers.get("x-middleware-request-x-ary-kiosk")).toBe("1");
  expect(kiosk.headers.get("x-middleware-request-x-ary-phone")).toBe("0");
});
test("query choice sets the functional cookie and preserves other query parameters", () => {
  const response = proxy(new NextRequest("http://localhost/experiencia?lang=es&view=saved"));
  expect(response.headers.get("location")).toBe("http://localhost/experiencia?view=saved");
  const cookie = response.cookies.get("ary_lang");
  expect(cookie?.value).toBe("es"); expect(cookie?.httpOnly).toBe(false); expect(cookie?.sameSite).toBe("lax");
  expect(cookie?.path).toBe("/"); expect(cookie?.maxAge).toBe(31536000);
});
