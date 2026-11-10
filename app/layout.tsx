import type { Metadata } from "next";
import "./globals.css";
import "./stage8.css";
import { requestLocale } from "../src/server/locale";
import { LocaleProvider } from "../src/components/locale-provider";

export const metadata: Metadata = {
  title: "Ary la Cotorra",
  description: "Descubre lo nuestro con Ary la Cotorra.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestLocale();
  return <html lang={locale}><body><LocaleProvider initialLocale={locale}>{children}</LocaleProvider></body></html>;
}
