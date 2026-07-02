import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarkarimatch.com"),
  title: {
    default: "SarkariMatch - Govt Job Notifications Matched to Your Eligibility",
    template: "%s | SarkariMatch"
  },
  description:
    "Create your profile once and discover govt job and exam notifications matched to your age, qualification, category, experience and location.",
  openGraph: {
    siteName: "SarkariMatch",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
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
