import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/lib/markdown";

const html = (source: string) => renderToStaticMarkup(createElement(Markdown, { source }));

describe("markdown renderer", () => {
  it("renders headings, lists, emphasis and safe links", () => {
    const out = html("## Title\n\nSome **bold** and *italic* text with a [link](https://example.com).\n\n- one\n- two\n\n1. first\n2. second");
    expect(out).toContain("<h2");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain("<ul");
    expect(out).toContain("<ol");
  });

  it("never outputs script tags, raw HTML or unsafe link targets", () => {
    const out = html("<script>alert(1)</script>\n\n[click](javascript:alert(1)) and [data](data:text/html;base64,AAAA) and <img src=x onerror=alert(1)>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("data:text/html");
    expect(out).toContain("&lt;script&gt;");
  });
});
