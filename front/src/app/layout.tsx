import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "euguide-ks | Udhezues qytetar per integrimin evropian",
  description: "Udhezues qytetar per rrugen e Kosoves drejt Bashkimit Evropian."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sq">
      <body>{children}</body>
    </html>
  );
}
