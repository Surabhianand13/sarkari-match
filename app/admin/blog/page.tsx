import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, DataTable, Flash, StatusPill, Td } from "@/components/admin/ui";
import { deletePost, unpublishPost } from "@/app/admin/blog/actions";
import { formatDate, getAllPostsForAdmin } from "@/lib/blog";

export const metadata = { title: "Blog" };

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const posts = await getAllPostsForAdmin();
  return (
    <div>
      <AdminHeader title="Blog" description={`${posts.length} articles · ${posts.filter((post) => post.status === "published").length} published`} action={{ href: "/admin/blog/new", label: "+ New article" }} />
      <Flash notice={notice} error={error} />
      <DataTable headers={["Title", "Status", "Published", "Tags", ""]} empty="No articles yet.">
        {posts.map((post) => (
          <tr key={post.id}>
            <Td><Link href={`/admin/blog/${post.id}` as Route} className="font-black text-primary hover:underline">{post.title}</Link><p className="text-xs text-muted">/blog/{post.slug}</p></Td>
            <Td><StatusPill status={post.status} /></Td>
            <Td>{formatDate(post.publishedAt) || "-"}</Td>
            <Td className="text-xs">{post.tags.join(", ")}</Td>
            <Td>
              <div className="flex gap-2">
                {post.status === "published" && <Link href={`/blog/${post.slug}` as Route} className="text-xs font-black text-primary underline">View</Link>}
                {post.status === "published" && <form action={unpublishPost}><input type="hidden" name="id" value={post.id} /><button className="text-xs font-black text-muted underline">Unpublish</button></form>}
                <form action={deletePost}><input type="hidden" name="id" value={post.id} /><button className="text-xs font-black text-error underline">Delete</button></form>
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
