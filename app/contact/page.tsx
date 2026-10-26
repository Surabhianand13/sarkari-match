import Link from "next/link";
import { Mail, ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/design-system";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'Contact Sarkari Match', description: 'Contact the Sarkari Match team for support, corrections and partnership questions.', path: '/contact' });

export default function ContactPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-success">Contact</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">Reach SarkariMatch</h1>
          <p className="mt-4 leading-7 text-muted">Use corrections for govt job notification issues, or email the team for product and account questions.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="mailto:support@sarkarimatch.in" className="rounded-2xl bg-surface p-4 font-black text-primary shadow-soft">
              <Mail className="mb-3 text-brand-green" size={22} aria-hidden="true" />
              support@sarkarimatch.in
            </Link>
            <Link href="/report-error" className="rounded-2xl bg-surface p-4 font-black text-primary shadow-soft">
              <ShieldAlert className="mb-3 text-brand-green" size={22} aria-hidden="true" />
              Report notification information
            </Link>
          </div>
          <ButtonLink href="/jobs" className="mt-6">Browse latest notifications</ButtonLink>
        </section>
      </div>
    </div>
  );
}
