import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, getPublishedPosts, readingMinutes } from "@/lib/blog";
import { breadcrumbJsonLd, buildMetadata, itemListJsonLd } from "@/lib/seo";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "Blog: SSC CGL Preparation, Exam Pattern and Test Strategy",
  description: "Practical articles on SSC CGL preparation, exam pattern, mock test analysis and govt exam strategy from the Sarkari Match team.",
  path: "/blog"
});

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  const crumbs = [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }];
  return (
    <div className="bg-surface">
      <JsonLd data={[breadcrumbJsonLd(crumbs), itemListJsonLd("Blog", posts.map((post) => ({ name: post.title, path: `/blog/${post.slug}` })))]} />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Blog</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-5xl">Preparation guides for govt exams</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Exam pattern, strategy and how to learn from every mock test.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}` as Route} className="group flex flex-col rounded-3xl border border-border bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
              <div className="flex flex-wrap gap-2">{post.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-mint px-2.5 py-1 text-xs font-black text-success">{tag}</span>)}</div>
              <h2 className="mt-3 text-xl font-black text-primary">{post.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">{post.excerpt}</p>
              <p className="mt-4 flex items-center justify-between text-xs font-bold text-muted">
                <span>{formatDate(post.publishedAt)} · {readingMinutes(post.content)} min read</span>
                <ArrowRight size={16} className="text-primary transition group-hover:translate-x-1" aria-hidden="true" />
              </p>
            </Link>
          ))}
          {!posts.length && <p className="rounded-3xl bg-white p-6 text-muted shadow-soft md:col-span-2 lg:col-span-3">Articles are coming soon.</p>}
        </div>
      </section>
    </div>
  );
}
