import { cookies, headers } from "next/headers";
import { acceptedLanguages, decideLocale, kioskLocale, LANGUAGE_COOKIE, phoneLocale, supportedLocale } from "../i18n/language";
export async function requestLocale(phone = false) {
  const h = await headers(), store = await cookies(), cookie = store.get(LANGUAGE_COOKIE)?.value;
  if (h.get("x-ary-kiosk") === "1") return kioskLocale(process.env.KIOSK_DEFAULT_LOCALE);
  if (phone || h.get("x-ary-phone") === "1") return phoneLocale(cookie, acceptedLanguages(h.get("accept-language")));
  const mobile = supportedLocale(store.get("ary_phone")?.value);
  return mobile ? supportedLocale(cookie) || mobile : decideLocale({ cookie, country: h.get("x-vercel-ip-country"), acceptLanguage: h.get("accept-language") });
}
