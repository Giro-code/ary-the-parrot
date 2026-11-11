import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { LocaleProvider } from "../../src/components/locale-provider";
import { Experience } from "../../src/components/experience";
import { Information } from "../../src/components/information";
import { Trip } from "../../src/components/trip";
import { AccountPrivacy } from "../../src/components/account-privacy";
import { Recovery } from "../../src/components/recovery";
import { PublicCulture } from "../../src/components/public-culture";
import { Kiosk } from "../../src/components/kiosk";
test("server-rendered app content is English immediately, with language controls", () => {
  const cases = [
    [<Experience key="experience" />, "My conversations"],
    [<Trip key="trip" />, "Your cultural collection"],
    [<Information key="privacy" kind="privacy" />, "Your experience, your choices"],
    [<AccountPrivacy key="account" marketingEnabled={false} sharingEnabled={false} />, "Privacy and your data"],
    [<Recovery key="recovery" initialLocale="en" marketingEnabled={false} />, "Pick up where you left off"],
    [<PublicCulture key="culture" items={{}} />, "This item is unavailable."],
    [<Kiosk key="kiosk" />, "Start"],
  ] as const;
  for (const [component, expected] of cases) {
    const html = renderToStaticMarkup(<LocaleProvider initialLocale="en">{component}</LocaleProvider>);
    expect(html).toContain(expected); expect(html).toContain("English"); expect(html).toContain("Español");
  }
});
test("Spanish privacy includes both functional language cookies and their purpose", () => {
  const html = renderToStaticMarkup(<LocaleProvider initialLocale="es"><Information kind="privacy" /></LocaleProvider>);
  expect(html).toContain("ary_lang"); expect(html).toContain("ary_phone"); expect(html).toContain("durante un año");
});
