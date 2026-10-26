import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

// Renders a small Markdown subset (headings, paragraphs, lists, quotes, bold, italic, code, links) as React elements.
// Nothing is injected as raw HTML, so article text can never run scripts.
function safeHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return /^https?:\/\//i.test(href) ? href : null;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${index++}`;
    if (token.startsWith("**")) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) nodes.push(<code key={key} className="rounded bg-surface px-1.5 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)!;
      const safe = safeHref(href);
      if (!safe) nodes.push(label);
      else if (safe.startsWith("/")) nodes.push(<Link key={key} href={safe as Route} className="font-bold text-primary underline">{label}</Link>);
      else nodes.push(<a key={key} href={safe} rel="noopener noreferrer nofollow" target="_blank" className="font-bold text-primary underline">{label}</a>);
    } else nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="grid gap-4 text-base leading-8 text-foreground">
      {blocks.map((block, i) => {
        const text = block.trim();
        if (!text) return null;
        const key = `b${i}`;
        if (/^###\s/.test(text)) return <h3 key={key} className="mt-4 text-xl font-black text-primary">{inline(text.replace(/^###\s+/, ""), key)}</h3>;
        if (/^##\s/.test(text)) return <h2 key={key} className="mt-6 text-2xl font-black text-primary">{inline(text.replace(/^##\s+/, ""), key)}</h2>;
        if (/^---+$/.test(text)) return <hr key={key} className="border-border" />;
        if (/^>\s/.test(text)) return <blockquote key={key} className="border-l-4 border-brand-green bg-mint/50 px-4 py-2 font-semibold text-primary">{inline(text.replace(/^>\s?/gm, ""), key)}</blockquote>;
        const lines = text.split("\n");
        if (lines.every((line) => /^[-*]\s/.test(line))) return <ul key={key} className="list-disc space-y-1 pl-6">{lines.map((line, j) => <li key={j}>{inline(line.replace(/^[-*]\s+/, ""), `${key}-${j}`)}</li>)}</ul>;
        if (lines.every((line) => /^\d+[.)]\s/.test(line))) return <ol key={key} className="list-decimal space-y-1 pl-6">{lines.map((line, j) => <li key={j}>{inline(line.replace(/^\d+[.)]\s+/, ""), `${key}-${j}`)}</li>)}</ol>;
        return <p key={key}>{inline(lines.join(" "), key)}</p>;
      })}
    </div>
  );
}
