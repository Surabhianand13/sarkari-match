import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { LoginPrompt } from "@/components/engagement/login-prompt";
import { SupportWidget } from "@/components/engagement/support-widget";
import { assistantEnabled } from "@/lib/assistant";
import { PurchaseToast } from "@/components/engagement/purchase-toast";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SiteChrome } from "@/components/site-chrome";
import { brand, getSiteUrl } from "@/lib/brand";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], display: "swap", variable: "--font-devanagari" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: brand.fullName,
  title: {
    default: `${brand.fullName}: SSC CGL Mock Test Series and Govt Job Notifications`,
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
          <SiteChrome header={<Header />} footer={<Footer />} mobileNav={<MobileBottomNav />} extras={<><PurchaseToast /><LoginPrompt /><SupportWidget whatsappNumber={(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "") || null} assistant={assistantEnabled()} /></>}>
            {children}
          </SiteChrome>
        </LocaleProvider>
      </body>
    </html>
  );
}
