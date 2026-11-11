import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { EmailWelcome } from "../../src/components/email-welcome";
import { AryStage } from "../../src/components/ary-stage";
import { Icon, WelcomeEnvelope } from "../../src/components/icons";
import { readFileSync } from "node:fs";
import { parse } from "acorn";
import { dictionaries } from "../../src/i18n";
import { renderEmail } from "../../src/server/email/templates";

test.each(["es", "en"] as const)("culture naming reaches navigation, collection and email copy in %s", locale => {
  const t = dictionaries[locale], name = locale === "es" ? "Mi cultura" : "My culture";
  expect(t.trip).toBe(name);
  expect(t.tripTitle).toBe(locale === "es" ? "Tu colección cultural" : "Your cultural collection");
  expect(t.tripSubtitle).toContain("Ary");
  for (const template of ["recovery", "saved_places"] as const) {
    const email = renderEmail(template, locale);
    expect(email.text).toContain(name);
    expect(email.html).toContain(name);
    expect(email.text).not.toMatch(/Mis viajes|Mi viaje|My trips|My trip/i);
  }
});
test.each(["es", "en"] as const)("email welcome %s has required unchecked terms, optional unchecked marketing and honest dry-run", locale => {
  const html = renderToStaticMarkup(<EmailWelcome locale={locale} dryRun onStarted={() => {}}/>);
  expect(html.match(/type="checkbox"/g)).toHaveLength(2); expect(html).not.toContain('checked=""');
  expect(html).toMatch(/type="checkbox" required=""/); expect(html).toContain('type="email"');
  expect(html).toContain('/terminos'); expect(html).toContain('/privacidad'); expect(html).toContain('role="img"');
  expect(html).toContain(locale === "es" ? "no se envía todavía" : "not sent yet");
  expect(html).toContain('disabled=""');
});
test("compact mascot and named SVGs retain accessible markup", () => {
  const html = renderToStaticMarkup(<AryStage state="listening" locale="es"/>);
  expect(html).not.toContain('<h1'); expect(html).toContain('data-ary-image="pensar"'); expect(html).toContain('role="status"');
  expect(renderToStaticMarkup(<Icon kind="trips" label="Mi cultura"/>)).toContain('aria-label="Mi cultura"');
  expect(renderToStaticMarkup(<WelcomeEnvelope label="Sobre de Ary"/>)).toContain('role="img"');
});
test("translated landing JS has identical syntax, tags, selectors, identifiers and API payload keys", () => {
  const ast = (path: string) => parse(readFileSync(path, "utf8"), {ecmaVersion:"latest"});
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== "object") return value;
    const node = value as Record<string, unknown>;
    if (node.type === "Literal" && typeof node.value === "string") return {type:"Literal", value:"text"};
    return Object.fromEntries(Object.entries(node).filter(([key]) => !["start", "end", "raw"].includes(key)).map(([key,v]) => [key,normalize(v)]));
  };
  expect(normalize(ast('public/site/landing.en.js'))).toEqual(normalize(ast('public/site/landing.js')));
  const codeStrings = (root: unknown) => {
    const values: unknown[] = [];
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      const callee = node.callee as {property?: {name?:string}} | undefined;
      if (node.type === "CallExpression" && ["createElement","querySelector","querySelectorAll","getElementById","getAttribute","setAttribute","closest","addEventListener","get","fetch"].includes(callee?.property?.name || "")) {
        const first = (node.arguments as {type:string;value?:unknown}[])[0]; if(first?.type === "Literal") values.push([callee?.property?.name,first.value]);
      }
      for (const child of Object.values(node)) if(Array.isArray(child))child.forEach(visit); else if(typeof child === "object")visit(child);
    };
    visit(root); return values;
  };
  expect(codeStrings(ast('public/site/landing.en.js'))).toEqual(codeStrings(ast('public/site/landing.js')));
  for (const path of ['public/site/landing.js','public/site/landing.en.js']) {
    const js=readFileSync(path,'utf8');
    expect(js).toMatch(/createElement\(['"]a['"]\)/); expect(js).toMatch(/querySelectorAll\(['"]a['"]\)/); expect(js).toContain("'/api/commercial/inquiries'");
    expect(js).toContain("payload.locale="); expect(js).toContain("payload.consentVersion=");
  }
});
