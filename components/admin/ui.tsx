import Link from "next/link";
import type { Route } from "next";

export const inputClass = "min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground";

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-primary">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action && (
        <Link href={action.href as Route} className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-white p-5 shadow-soft ${className}`}>
      {title && <h2 className="mb-3 text-lg font-black text-primary">{title}</h2>}
      {children}
    </section>
  );
}

export function Flash({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return (
    <p role="status" className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold ${error ? "bg-red-50 text-error" : "bg-mint text-success"}`}>
      {error ?? notice}
    </p>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-black text-primary">
      {label}
      {children}
      {hint && <span className="text-xs font-semibold text-muted">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ children, variant = "primary", name, value }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; name?: string; value?: string }) {
  const styles = {
    primary: "bg-[linear-gradient(135deg,#18B943,#0D9488)] text-white shadow-green",
    secondary: "border border-border bg-white text-primary",
    danger: "border border-red-200 bg-red-50 text-error"
  }[variant];
  return (
    <button name={name} value={value} className={`min-h-11 rounded-full px-5 text-sm font-black ${styles}`}>
      {children}
    </button>
  );
}

const pillStyles: Record<string, string> = {
  published: "bg-mint text-success",
  approved: "bg-mint text-success",
  auto_passed: "bg-cyan-soft text-teal",
  reviewed: "bg-cyan-soft text-teal",
  needs_review: "bg-amber-soft text-warning",
  pending: "bg-amber-soft text-warning",
  draft: "bg-surface text-muted",
  archived: "bg-surface text-muted",
  rejected: "bg-red-50 text-error",
  auto_failed: "bg-red-50 text-error",
  expired: "bg-surface text-muted"
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${pillStyles[status] ?? "bg-surface text-muted"}`}>{status.replaceAll("_", " ")}</span>;
}

export function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface text-xs font-black uppercase tracking-wide text-muted">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {!hasRows && <p className="px-4 py-6 text-center text-sm font-semibold text-muted">{empty ?? "Nothing here yet."}</p>}
    </div>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export function ButtonLinkSmall({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href as Route} className="font-black text-primary underline">{children}</Link>;
}
