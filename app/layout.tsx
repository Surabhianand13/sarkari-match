import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { brand, getSiteUrl } from "@/lib/brand";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], display: "swap", variable: "--font-devanagari" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: brand.fullName,
  title: {
    default: `${brand.fullName} - Govt Job Notifications Matched to Your Eligibility`,
    template: `%s | ${brand.fullName}`
  },
  description: brand.shortDescription,
  openGraph: {
    siteName: brand.fullName,
    type: "website",
    locale: brand.locale
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#0B2D63",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${manrope.variable} ${notoDevanagari.variable}`}>
      <body>
        <LocaleProvider>
          <Header />
          <main className="pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
        </LocaleProvider>
      </body>
    </html>
  );
}
