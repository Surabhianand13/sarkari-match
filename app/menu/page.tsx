import Link from "next/link";
import { ArrowRight } from "lucide-react";

const links = [
  ["Home", "/"],
  ["Test Series & Question Bank", "/tests"],
  ["SSC CGL Mock Tests", "/tests/ssc-cgl"],
  ["Govt Exam & Job Notifications", "/jobs"],
  ["Central Govt Job Notifications", "/jobs/central"],
  ["State Govt Job Notifications", "/jobs/state"],
  ["Qualification-wise Notifications", "/jobs/qualification"],
  ["Department-wise Notifications", "/jobs/department"],
  ["Find My Matches", "/eligibility"],
  ["Pricing", "/pricing"],
  ["Dashboard", "/dashboard"],
  ["Admin", "/admin"],
  ["Contact", "/contact"]
] as const;

export default function MenuPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-black text-primary">Menu</h1>
      <nav className="mt-6 grid gap-3" aria-label="Mobile menu">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="flex min-h-14 items-center justify-between rounded-2xl bg-white px-4 font-black text-primary shadow-soft">
            {label}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
