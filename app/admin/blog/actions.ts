"use server";

import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { optionalText, slugify, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";

const BASE = "/admin/blog";

export async function savePost(formData: FormData) {
  const admin = await requireAdmin();
  const id = optionalText(formData, "id");
  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug") || title);
  const excerpt = text(formData, "excerpt");
  const content = text(formData, "content");
  const author = text(formData, "author") || "Sarkari Match Editorial";
  const tags = text(formData, "tags").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
  const publish = formData.get("intent") === "publish";
  const back = id ? `${BASE}/${id}` : `${BASE}/new`;
  if (!title || !slug || excerpt.length < 40 || content.length < 200) goTo(withMessage(back, "error", "Add a title, a summary of at least 40 characters and the article text (at least 200 characters)."));
  const db = await adminDb();
  let savedId = id;
  try {
    if (!id) {
      savedId = (await db.query<{ id: string }>(
        `insert into blog_posts (slug, title, excerpt, content, tags, author, status, published_at, created_by)
         values ($1,$2,$3,$4,$5,$6,$7, case when $7 = 'published' then now() end, $8) returning id`,
        [slug, title, excerpt, content, tags, author, publish ? "published" : "draft", admin.id.startsWith("00000000-0000-4000") ? null : admin.id]
      )).rows[0].id;
    } else {
      await db.query(
        `update blog_posts set slug = $2, title = $3, excerpt = $4, content = $5, tags = $6, author = $7,
           status = case when $8 then 'published' else status end,
           published_at = case when $8 and published_at is null then now() else published_at end, updated_at = now()
         where id = $1`,
        [id, slug, title, excerpt, content, tags, author, publish]
      );
    }
  } catch (error) {
    goTo(withMessage(back, "error", friendlyDbError(error)));
  }
  await writeAudit(db, { actorId: admin.id, action: id ? "blog.update" : "blog.create", entityType: "blog_post", entityId: savedId, after: { title, slug, published: publish } });
  revalidatePublicContent();
  goTo(withMessage(BASE, "notice", publish ? "Article published." : "Draft saved."));
}

export async function unpublishPost(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const db = await adminDb();
  await db.query("update blog_posts set status = 'draft', updated_at = now() where id = $1", [id]);
  await writeAudit(db, { actorId: admin.id, action: "blog.unpublish", entityType: "blog_post", entityId: id });
  revalidatePublicContent();
  goTo(withMessage(BASE, "notice", "Article moved back to draft."));
}

export async function deletePost(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const db = await adminDb();
  await db.query("delete from blog_posts where id = $1", [id]);
  await writeAudit(db, { actorId: admin.id, action: "blog.delete", entityType: "blog_post", entityId: id });
  revalidatePublicContent();
  goTo(withMessage(BASE, "notice", "Article deleted."));
}
