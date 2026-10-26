import { Field, SubmitButton, inputClass } from "@/components/admin/ui";
import { savePost } from "@/app/admin/blog/actions";
import type { BlogPost } from "@/lib/blog";

export function BlogForm({ post }: { post?: BlogPost }) {
  return (
    <form action={savePost} className="grid max-w-4xl gap-5 rounded-2xl border border-border bg-white p-5 shadow-soft">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Field label="Title"><input name="title" required maxLength={160} defaultValue={post?.title} className={inputClass} /></Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Web address (slug)" hint="Leave empty to build it from the title. Changing it later breaks old links."><input name="slug" maxLength={120} defaultValue={post?.slug} className={inputClass} /></Field>
        <Field label="Tags" hint="Comma separated, up to 6. Example: SSC CGL, Strategy"><input name="tags" defaultValue={post?.tags.join(", ")} className={inputClass} /></Field>
      </div>
      <Field label="Summary" hint="Shown on the blog list and in search results. 40 to 300 characters."><textarea name="excerpt" required minLength={40} maxLength={300} rows={3} defaultValue={post?.excerpt} className={inputClass} /></Field>
      <Field label="Author"><input name="author" maxLength={80} defaultValue={post?.author ?? "Sarkari Match Editorial"} className={inputClass} /></Field>
      <Field label="Article" hint="Markdown: ## Heading, ### Subheading, - bullet list, 1. numbered list, **bold**, *italic*, [link text](https://...), > quote. Separate paragraphs with a blank line.">
        <textarea name="content" required minLength={200} rows={22} defaultValue={post?.content} className={`${inputClass} font-mono leading-6`} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="secondary" name="intent" value="draft">{post?.status === "published" ? "Save changes" : "Save draft"}</SubmitButton>
        <SubmitButton name="intent" value="publish">{post?.status === "published" ? "Save and keep published" : "Publish"}</SubmitButton>
      </div>
    </form>
  );
}
