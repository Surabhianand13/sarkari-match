import { notFound } from "next/navigation";
import { AdminHeader, Flash } from "@/components/admin/ui";
import { BlogForm } from "@/components/admin/blog-form";
import { getPostForAdmin } from "@/lib/blog";

export const metadata = { title: "Edit article" };

export default async function EditPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const post = await getPostForAdmin(id);
  if (!post) notFound();
  return (
    <div>
      <AdminHeader title="Edit article" />
      <Flash error={error} />
      <BlogForm post={post} />
    </div>
  );
}
