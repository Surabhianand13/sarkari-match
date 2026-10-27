import Link from "next/link";

export type LegalSection = { heading: string; body?: string[]; bullets?: string[] };

// Single-paragraph pages pass `body`; the full policies pass `sections`.
export function LegalPage({ title, body, sections, updated }: { title: string; body?: string; sections?: LegalSection[]; updated?: string }) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <article className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-success">Sarkari Match</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">{title}</h1>
          {updated && <p className="mt-1 text-sm font-semibold text-muted">Last updated: {updated}</p>}
          {body && <p className="mt-4 leading-7 text-muted">{body}</p>}
          {sections?.map((section) => (
            <section key={section.heading} className="mt-8">
              <h2 className="text-xl font-black text-primary">{section.heading}</h2>
              {section.body?.map((paragraph) => <p key={paragraph} className="mt-3 leading-7 text-muted">{paragraph}</p>)}
              {section.bullets && <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-7 text-muted">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
          {sections && <p className="mt-10 border-t border-border pt-4 text-sm font-semibold text-muted">Questions? <Link href="/contact" className="text-primary underline">Contact us</Link>.</p>}
        </article>
      </div>
    </div>
  );
}
