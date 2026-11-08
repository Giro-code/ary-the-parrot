import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ary la Cotorra",
  description: "Descubre lo nuestro con Ary la Cotorra.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
