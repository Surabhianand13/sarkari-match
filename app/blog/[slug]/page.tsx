import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, getPostBySlug, getPublishedPosts, readingMinutes } from "@/lib/blog";
import { Markdown } from "@/lib/markdown";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedPosts(200)).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  return buildMetadata({ title: post.title, description: post.excerpt, path: `/blog/${post.slug}`, type: "article" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const related = (await getPublishedPosts(4)).filter((item) => item.slug !== post.slug).slice(0, 3);
  const path = `/blog/${post.slug}`;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path }];
  return (
    <div className="bg-surface">
      <JsonLd data={[breadcrumbJsonLd(crumbs), articleJsonLd({ title: post.title, description: post.excerpt, path, author: post.author, publishedAt: post.publishedAt, updatedAt: post.updatedAt })]} />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm font-bold text-muted"><Link href="/blog" className="hover:text-primary">Blog</Link> / <span className="text-primary">{post.title}</span></nav>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-primary sm:text-5xl">{post.title}</h1>
        <p className="mt-3 text-sm font-bold text-muted">By {post.author} · {formatDate(post.publishedAt)} · {readingMinutes(post.content)} min read</p>
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-soft sm:p-10"><Markdown source={post.content} /></div>
        <div className="mt-8 rounded-3xl bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white">
          <p className="text-xl font-black">Put it into practice</p>
          <p className="mt-1 text-white/80">Take the free sample test in the real exam window and see your score with solutions.</p>
          <Link href="/tests" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-black text-primary">Try the free sample test</Link>
        </div>
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-black text-primary">More to read</h2>
            <div className="mt-4 grid gap-3">{related.map((item) => <Link key={item.id} href={`/blog/${item.slug}` as Route} className="rounded-2xl bg-white p-4 font-black text-primary shadow-soft hover:bg-mint">{item.title}</Link>)}</div>
          </div>
        )}
      </article>
    </div>
  );
}
