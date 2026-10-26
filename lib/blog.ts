import { getDb } from "@/lib/db";

export type BlogPost = { id: string; slug: string; title: string; excerpt: string; content: string; tags: string[]; author: string; status: "draft" | "published"; publishedAt: string | null; updatedAt: string };

type Row = { id: string; slug: string; title: string; excerpt: string; content: string; tags: string[]; author: string; status: "draft" | "published"; published_at: string | null; updated_at: string };

const columns = "id, slug, title, excerpt, content, tags, author, status, published_at::text as published_at, updated_at::text as updated_at";

function toPost(row: Row): BlogPost {
  return { id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, content: row.content, tags: row.tags ?? [], author: row.author, status: row.status, publishedAt: row.published_at, updatedAt: row.updated_at };
}

export async function getPublishedPosts(limit = 50): Promise<BlogPost[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.query<Row>(`select ${columns} from blog_posts where status = 'published' order by published_at desc limit $1`, [limit]);
  return result.rows.map(toPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.query<Row>(`select ${columns} from blog_posts where slug = $1 and status = 'published'`, [slug]);
  return result.rows[0] ? toPost(result.rows[0]) : null;
}

export async function getPostForAdmin(id: string): Promise<BlogPost | null> {
  const db = await getDb();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await db.query<Row>(`select ${columns} from blog_posts where id = $1`, [id]);
  return result.rows[0] ? toPost(result.rows[0]) : null;
}

export async function getAllPostsForAdmin(): Promise<BlogPost[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.query<Row>(`select ${columns} from blog_posts order by coalesce(published_at, created_at) desc`);
  return result.rows.map(toPost);
}

export function readingMinutes(content: string) {
  return Math.max(1, Math.round(content.split(/\s+/).length / 200));
}

export function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}
