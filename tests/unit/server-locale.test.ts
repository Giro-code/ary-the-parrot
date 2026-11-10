import { beforeEach, expect, test, vi } from "vitest";
const { incoming, stored } = vi.hoisted(() => ({ incoming: new Map<string, string>(), stored: new Map<string, string>() }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (key: string) => incoming.get(key) || null }), cookies: async () => ({ get: (key: string) => stored.has(key) ? { value: stored.get(key)! } : undefined }) }));
import { requestLocale } from "../../src/server/locale";
beforeEach(() => { incoming.clear(); stored.clear(); vi.unstubAllEnvs(); });
test("server selects the public locale before render", async () => {
  incoming.set("x-vercel-ip-country", "MX"); expect(await requestLocale()).toBe("es");
  stored.set("ary_lang", "en"); expect(await requestLocale()).toBe("en");
});
test("kiosk server ignores visitor cookie, country and browser language", async () => {
  incoming.set("x-ary-kiosk", "1"); incoming.set("x-vercel-ip-country", "MX"); incoming.set("accept-language", "es-ES"); stored.set("ary_lang", "es");
  expect(await requestLocale()).toBe("en"); vi.stubEnv("KIOSK_DEFAULT_LOCALE", "es"); expect(await requestLocale()).toBe("es");
});
test("QR preview uses browser, subsequent renders retain the navigator confirmation", async () => {
  incoming.set("accept-language", "en-US"); incoming.set("x-vercel-ip-country", "MX");
  expect(await requestLocale(true)).toBe("en");
  stored.set("ary_phone", "es"); expect(await requestLocale()).toBe("es");
  stored.set("ary_lang", "en"); expect(await requestLocale()).toBe("en");
});
