import Image from "next/image";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { ButtonLink } from "@/components/design-system";
import { HeaderAuthActions } from "@/components/auth/header-auth-actions";
import { HeaderNav } from "@/components/header-nav";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { T } from "@/components/i18n/t";
import { brand } from "@/lib/brand";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 shadow-[0_8px_30px_rgba(11,45,99,0.06)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={brand.fullName}>
          <Image
            src="/brand/sarkarimatch-logo.png"
            alt={brand.fullName}
            width={1167}
            height={474}
            priority
            className="h-12 w-auto sm:h-14"
          />
        </Link>
        <HeaderNav />
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/jobs" className="inline-flex size-11 items-center justify-center rounded-md text-primary hover:bg-background lg:hidden" aria-label="Search govt job notifications">
            <Search size={20} aria-hidden="true" />
          </Link>
          <LanguageToggle />
          <HeaderAuthActions />
          <ButtonLink href="/tests" className="hidden whitespace-nowrap sm:inline-flex"><T k="cta_free_sample" /></ButtonLink>
          <Link href="/menu" className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-soft lg:hidden" aria-label="Open menu">
            <Menu size={20} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
