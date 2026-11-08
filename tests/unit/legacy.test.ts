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

  test("HTML, CSS y JS conservan el original salvo la entrada aprobada", () => {
    const original = read("legacy/index.html");
    const style = original.match(/<style>([\s\S]*?)<\/style>/)![1];
    const script = original.match(/<script>([\s\S]*?)<\/script>/)![1];
    expect(read("public/site/landing.css")).toBe(style);
    expect(read("public/site/landing.js")).toBe(script);
    const expected = original
      .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/site/landing.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="/site/landing.js"></script>');
    const actual = read("public/index.html");
    const entry = '<p class="experience-entry"><a class="text-link" href="/experiencia">Explorar Ary · kiosco y móvil <span aria-hidden="true">→</span></a></p>';
    expect(actual.split(entry)).toHaveLength(2);
    expect(actual.replace(entry, "")).toBe(expected);
  });
});
