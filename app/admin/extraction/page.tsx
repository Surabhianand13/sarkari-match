import { Bot, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { publishAllowedForExtraction } from "@/lib/extraction/review";

export const metadata = { robots: { index: false, follow: false } };

export default async function ExtractionReviewPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-primary">Notification extraction review</h1>
      <p className="mt-3 text-muted">AI-assisted extraction may create drafts, but publication is blocked until a human reviewer approves and verifies the data.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <Bot className="text-indigo" size={28} aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black text-primary">Draft extraction</h2>
          <p className="mt-2 text-sm text-muted">Extraction payloads are stored separately from published recruitments.</p>
        </section>
        <section className="rounded-3xl bg-mint p-5 shadow-soft">
          <ShieldCheck className="text-success" size={28} aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black text-primary">Publish gate</h2>
          <p className="mt-2 text-sm font-bold text-success">Allowed only when status is approved and human verified: {publishAllowedForExtraction("approved", true) ? "Yes" : "No"}</p>
        </section>
      </div>
    </div>
  );
}
