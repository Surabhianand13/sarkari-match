export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <article className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-success">SarkariMatch</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">{title}</h1>
          <p className="mt-4 leading-7 text-muted">{body}</p>
        </article>
      </div>
    </div>
  );
}
