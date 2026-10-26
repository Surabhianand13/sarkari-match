import { AdminHeader, Flash } from "@/components/admin/ui";
import { BlogForm } from "@/components/admin/blog-form";

export const metadata = { title: "New article" };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div>
      <AdminHeader title="New article" />
      <Flash error={error} />
      <BlogForm />
    </div>
  );
}
