import { requireAdmin } from "@/lib/auth/guards";
import { ButtonLink } from "@/components/design-system";

export async function AdminPlaceholder({ title, body }: { title: string; body: string }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-[2rem] bg-white p-6 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Admin</p>
        <h1 className="mt-2 text-3xl font-black text-primary">{title}</h1>
        <p className="mt-3 text-muted">{body}</p>
        <ButtonLink href="/admin" className="mt-6">Back to admin</ButtonLink>
      </section>
    </div>
  );
}
