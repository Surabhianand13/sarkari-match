import { notFound } from "next/navigation";
import { AdminHeader, ButtonLinkSmall, Card, DataTable, Flash, StatusPill, SubmitButton, Td } from "@/components/admin/ui";
import { RecruitmentForm } from "@/components/admin/recruitment-form";
import { setRecruitmentStatus } from "@/app/admin/recruitments/actions";
import { adminDb } from "@/lib/admin/db";
import { listOrganisationOptions } from "@/lib/admin/lookups";

export const metadata = { title: "Recruitment" };

const nextSteps: Record<string, Array<[string, string, "primary" | "secondary" | "danger"]>> = {
  draft: [["needs_review", "Submit for review", "primary"]],
  needs_review: [["reviewed", "Mark reviewed", "primary"], ["draft", "Back to draft", "secondary"]],
  reviewed: [["published", "Publish", "primary"], ["draft", "Back to draft", "secondary"]],
  published: [["draft", "Unpublish", "secondary"], ["expired", "Mark expired", "secondary"], ["archived", "Archive", "danger"]],
  expired: [["archived", "Archive", "secondary"], ["draft", "Reopen as draft", "secondary"]],
  archived: [["draft", "Restore as draft", "secondary"]]
};

export default async function RecruitmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const organisations = await listOrganisationOptions();
  if (id === "new") {
    return (
      <div className="grid gap-4">
        <AdminHeader title="New recruitment" />
        <Flash error={error} />
        <Card><RecruitmentForm organisations={organisations} /></Card>
      </div>
    );
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await adminDb();
  const { rows } = await db.query(
    `select id, organisation_id, title, slug, notification_number, notification_date::text, application_start_date::text, application_end_date::text,
            official_notification_url, official_application_url, official_website_url, summary, verification_notes, editorial_status, verified_at::text
     from recruitments where id = $1`,
    [id]
  );
  const recruitment = rows[0] as Record<string, string | null> | undefined;
  if (!recruitment) notFound();
  const posts = await db.query<{ id: string; title: string; active: boolean; published_at: string | null }>("select id, title, active, published_at::text from job_posts where recruitment_id = $1 order by created_at", [id]);

  return (
    <div className="grid gap-4">
      <AdminHeader title={recruitment.title ?? "Recruitment"} description="Edit details, then move it through review to publication." />
      <Flash notice={notice} error={error} />
      <Card title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={recruitment.editorial_status ?? "draft"} />
          {recruitment.verified_at && <span className="text-xs font-semibold text-muted">Verified {new Date(recruitment.verified_at).toLocaleString("en-IN")}</span>}
          {(nextSteps[recruitment.editorial_status ?? "draft"] ?? []).map(([to, label, variant]) => (
            <form key={to} action={setRecruitmentStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="to" value={to} />
              <SubmitButton variant={variant}>{label}</SubmitButton>
            </form>
          ))}
        </div>
      </Card>
      <Card><RecruitmentForm values={recruitment} organisations={organisations} /></Card>
      <Card title="Posts under this recruitment">
        <DataTable headers={["Post", "Live", ""]} empty="No posts yet.">
          {posts.rows.map((post) => (
            <tr key={post.id}>
              <Td className="font-black text-primary">{post.title}</Td>
              <Td><StatusPill status={post.active && post.published_at ? "published" : "draft"} /></Td>
              <Td><ButtonLinkSmall href={`/admin/posts/${post.id}`}>Edit</ButtonLinkSmall></Td>
            </tr>
          ))}
        </DataTable>
        <div className="mt-3"><ButtonLinkSmall href={`/admin/posts/new?recruitment=${id}`}>Add a post</ButtonLinkSmall></div>
      </Card>
    </div>
  );
}
