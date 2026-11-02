// Runs inside the page you have open (injected when you click Analyse). It must stay self-contained:
// chrome.scripting copies this one function into the page, so nothing outside it is available.
// It only reads what is on screen: text, links and tables. It sends nothing itself.
export function extractPage(mode) {
  const squash = (value, max) =>
    String(value || "")
      .replace(/[  ]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, max);
  const oneLine = (value, max) => squash(value, max).replace(/\s+/g, " ");

  // The article body when there is one, so menus and footers add less noise. A listing page needs the whole page.
  const candidates = [...document.querySelectorAll("article, main, [role=main], .entry-content, .post-content")].sort((a, b) => b.innerText.length - a.innerText.length);
  const scope = mode === "page" && candidates[0] && candidates[0].innerText.length > 800 ? candidates[0] : document.body;

  // The label next to a link: the first cell of its table row ("Apply Online"), or the words around it.
  const contextOf = (anchor) => {
    const row = anchor.closest("tr");
    // A listing laid out as a table: the whole row says what the link is ("date | board | post | qualification | last date").
    if (mode === "list") return row && row.cells.length > 2 ? [...row.cells].slice(0, 10).map((cell) => oneLine(cell.innerText, 120)).join(" | ").slice(0, 400) : "";
    if (row && row.cells.length > 1 && !row.cells[0].contains(anchor)) return oneLine(row.cells[0].innerText, 200);
    const holder = anchor.closest("li, p, td, th");
    return holder ? oneLine(holder.innerText.replace(anchor.innerText, ""), 200) : "";
  };

  const found = new Map();
  const collect = (container) => {
    for (const anchor of container.querySelectorAll("a[href]")) {
      if (found.size >= 3000) return;
      const href = anchor.href;
      if (!/^https?:/i.test(href)) continue;
      const context = contextOf(anchor);
      const existing = found.get(href);
      // The same address often appears in the text and again in the links table. Keep the one that has a label.
      if (existing && (existing.context || !context)) continue;
      found.set(href, { href: href.slice(0, 2000), text: oneLine(anchor.innerText || anchor.getAttribute("title") || anchor.getAttribute("aria-label"), 300), context });
    }
  };
  collect(scope);
  if (scope !== document.body) collect(document.body);

  const tables = [];
  if (mode === "page") {
    for (const table of [...scope.querySelectorAll("table")].slice(0, 20)) {
      const rows = [...table.rows].slice(0, 100).map((row) => [...row.cells].slice(0, 14).map((cell) => oneLine(cell.innerText, 300)));
      if (rows.length) tables.push(rows);
    }
  }

  // The link to the next page of a long listing, when the site has one.
  const nextAnchor = mode === "list" ? document.querySelector("a[rel~=next], .pagination .next a, a.next, .nav-links a.next, li.next a") : null;
  const next = nextAnchor && /^https?:/i.test(nextAnchor.href) && nextAnchor.href !== location.href ? nextAnchor.href : "";

  return {
    mode,
    next,
    url: location.href,
    title: oneLine(document.title, 500),
    text: mode === "page" ? squash(scope.innerText, 120000) : "",
    links: [...found.values()],
    tables
  };
}
