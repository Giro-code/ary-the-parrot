import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const manifest = read("legacy/SHA256SUMS").trim().split(/\r?\n/).map((line) => {
  const [hash, path] = line.split(/\s+\*\.\//);
  return { hash, path };
});

describe("originales y copias públicas", () => {
  test.each(manifest)("legacy/$path conserva su SHA-256", ({ hash, path }) => {
    expect(createHash("sha256").update(readFileSync(`legacy/${path}`)).digest("hex")).toBe(hash);
  });

  test.each(manifest.filter(({ path }) => path.startsWith("assets/") || path === "brochure.html"))(
    "public/$path es byte-idéntico al manifiesto original",
    ({ hash, path }) => {
      expect(createHash("sha256").update(readFileSync(`public/${path}`)).digest("hex")).toBe(hash);
    },
  );

  test("new ES/EN landing keeps working links, B2B code and visible image credits", () => {
    for (const path of ["public/index.html", "public/en/index.html"]) {
      const html = read(path);
      expect(html).toContain('href="/experiencia"'); expect(html).toContain('id="request-form"');
      expect(html).toContain("Wikimedia Commons"); expect(html).toContain("creativecommons.org");
      expect(html).not.toMatch(/kiosco|kiosk/i); expect(html).not.toMatch(/[→↗]/);
    }
    for (const path of ["public/site/landing.js", "public/site/landing.en.js"]) {
      const js = read(path); expect(js).toContain('/api/commercial/inquiries'); expect(js).toMatch(/createElement\(['"]a['"]\)/);
      expect(js).not.toContain("createElement('to')");
    }
  });
});
