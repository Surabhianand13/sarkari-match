"use client";

import { usePathname } from "next/navigation";

// The admin panel has its own shell, so the public header, footer and mobile bar are not rendered there.
export function SiteChrome({ header, footer, mobileNav, extras, children }: { header: React.ReactNode; footer: React.ReactNode; mobileNav: React.ReactNode; extras: React.ReactNode; children: React.ReactNode }) {
  const inAdmin = usePathname().startsWith("/admin");
  if (inAdmin) return <>{children}</>;
  return (
    <>
      {header}
      <main className="pb-20 md:pb-0">{children}</main>
      {footer}
      {mobileNav}
      {extras}
    </>
  );
}
