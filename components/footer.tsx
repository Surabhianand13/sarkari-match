import Link from "next/link";
import { T } from "@/components/i18n/t";
import { brand } from "@/lib/brand";

const footerGroups = [
  {
    title: "Explore",
    links: [
      ["SSC CGL Test Series", "/tests"],
      ["Govt Job Notifications", "/jobs"],
      ["Qualifications", "/jobs/qualification"],
      ["State Govt Notifications", "/jobs/state"],
      ["Departments", "/jobs/department"]
    ]
  },
  {
    title: "Product",
    links: [
      ["Eligibility", "/eligibility"],
      ["Pricing", "/pricing"],
      ["Editorial policy", "/editorial-policy"],
      ["Corrections", "/corrections"]
    ]
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Refund policy", "/refund-policy"],
      ["Report an error", "/report-error"]
    ]
  },
  {
    title: "Support",
    links: [
      ["Contact", "/contact"],
      ["About", "/about"],
      ["Sign in", "/login"],
      ["Create account", "/signup"]
    ]
  }
] as const;

export function Footer() {
  return (
    <footer className="border-t border-[#123A73] bg-[#071f46] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="text-2xl font-black text-white">{brand.name} <span className="text-[#B9F8CD]">{brand.byline}</span></p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
              <T k="footer_disclaimer" />
            </p>
            <div className="mt-5 rounded-2xl bg-white/8 p-4 text-sm font-semibold leading-6 text-white/70">
              Always verify age, qualification, category, fee, dates and official links in the original notification before applying.
            </div>
          </div>
          <nav aria-label="Footer" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B9F8CD]">{group.title}</p>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-white/70">
                  {group.links.map(([label, href]) => (
                    <Link key={href} href={href} className="transition hover:text-white">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs font-semibold text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {brand.fullName}. Independent eligibility guidance.</p>
          <p>No selection, appointment or application success is guaranteed.</p>
        </div>
      </div>
    </footer>
  );
}
