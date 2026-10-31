// Questions and solutions stay plain text. Two small conventions are drawn properly on screen:
//   Tables: rows that start and end with |, a separator row such as |---|---|, then data rows.
//   Maths: Unicode symbols (√ π ° × ÷ ² ...), plus ^ for powers and _ for subscripts: x^2, 2^{n+1}, a_1, a_{n+1}.
// Learners never see a figure, so a question may not depend on one (see figureProblem).

export type RichBlock = { type: "text"; text: string } | { type: "table"; header: string[]; rows: string[][] };
export type InlinePart = { kind: "text" | "sup" | "sub"; text: string };

export const MAX_TABLE_COLUMNS = 8;
export const MAX_TABLE_ROWS = 25;

const isPipeRow = (line: string) => /^\|.*\|$/.test(line.trim()) && line.trim().length > 2;
const cells = (line: string) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
const isSeparator = (line: string) => isPipeRow(line) && cells(line).every((cell) => /^:?-+:?$/.test(cell));

// Consecutive pipe rows, as [startLine, endLineExclusive].
function pipeRuns(lines: string[]): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let start = -1;
  lines.forEach((line, index) => {
    if (isPipeRow(line)) {
      if (start < 0) start = index;
    } else if (start >= 0) {
      runs.push([start, index]);
      start = -1;
    }
  });
  if (start >= 0) runs.push([start, lines.length]);
  return runs;
}

// Splits text into paragraphs and tables. A table needs a header row and a separator row; anything else stays as text.
export function parseRichBlocks(input: string): RichBlock[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join("\n").replace(/^\n+|\n+$/g, "");
    if (text) blocks.push({ type: "text", text });
    buffer = [];
  };

  let index = 0;
  while (index < lines.length) {
    if (isPipeRow(lines[index]) && index + 1 < lines.length && isSeparator(lines[index + 1])) {
      let end = index + 2;
      while (end < lines.length && isPipeRow(lines[end])) end++;
      const header = cells(lines[index]);
      const rows = lines.slice(index + 2, end).map(cells);
      if (rows.length) {
        flush();
        blocks.push({ type: "table", header, rows });
        index = end;
        continue;
      }
    }
    buffer.push(lines[index]);
    index++;
  }
  flush();
  return blocks;
}

// Splits one line into plain, superscript and subscript parts: x^2, 2^{n+1}, a_1, a_{n+1}.
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /([A-Za-z0-9)\]])([\^_])(\{[^{}]{1,24}\}|-?\d{1,3}|[A-Za-z])/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    const body = match[3].startsWith("{") ? match[3].slice(1, -1) : match[3];
    const before = text.slice(last, at) + match[1];
    if (before) parts.push({ kind: "text", text: before });
    parts.push({ kind: match[2] === "^" ? "sup" : "sub", text: body });
    last = at + match[0].length;
  }
  const rest = text.slice(last);
  if (rest) parts.push({ kind: "text", text: rest });
  return parts.length ? parts : [{ kind: "text", text }];
}

// Why a piece of question or solution text cannot be drawn properly, or null when it is fine.
export function richTextProblem(text: string, options: { singleLine?: boolean } = {}): string | null {
  if (options.singleLine && /\n/.test(text)) return "An option must be a single line of text, with no table or line breaks.";
  if (/!\[[^\]]*\]\([^)]*\)|<\s*(?:img|svg|script|iframe|table)\b/i.test(text)) return "Images and HTML are not supported. Use plain text, or a table written with | rows.";
  // A LaTeX command such as \frac, once read as JSON, leaves a form feed or backspace behind.
  if (/[\u0008\u000b\u000c]/.test(text)) return "The text contains a stray control character, usually from LaTeX or a backslash. Write maths in plain Unicode.";
  if (/\\(?:frac|sqrt|times|cdot|left|right|text|begin|end)\b|\$\$|\\\(|\\\[/.test(text)) return "Write maths in plain Unicode (√, π, ×, ², ^ and _), not LaTeX.";
  if (/[\^_]\{[^}]*$/.test(text) || /[\^_]\{[^}]*\{/.test(text)) return "A power or subscript is missing its closing brace.";

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (const [start, end] of pipeRuns(lines)) {
    const run = lines.slice(start, end);
    if (run.length < 2) continue;
    if (!isSeparator(run[1])) return "A table needs a header row, then a separator row like |---|---|, then data rows.";
    if (run.length < 3) return "A table needs at least one data row under the separator.";
    const width = cells(run[0]).length;
    if (run.some((line) => cells(line).length !== width)) return "Every row of a table must have the same number of cells.";
    if (width > MAX_TABLE_COLUMNS) return `A table can have at most ${MAX_TABLE_COLUMNS} columns.`;
    if (run.length - 2 > MAX_TABLE_ROWS) return `A table can have at most ${MAX_TABLE_ROWS} data rows.`;
  }
  return null;
}

// Learners see text only, plus a table or chart that belongs to the question's data set. A question that points at anything
// else (a figure, diagram or picture), or at a chart or table that is not there, cannot be answered.
const lead = "(?:in|from|see|refer to|according to|shown in|given in|using|study|observe)\\s+the\\s+(?:given\\s+|following\\s+)?";
const chartWord = "(?:graph|chart|pie[- ]?chart|bar[- ]?(?:chart|graph)|line[- ]?(?:chart|graph))";
const pictureWord = "(?:figure|diagram|image|picture)";
const referencesTo = (word: string) => [
  new RegExp(`\\b${lead}${word}\\b`, "i"),
  new RegExp(`\\b${word}\\s+(?:below|above|given|shown|alongside|drawn)\\b`, "i"),
  new RegExp(`\\b(?:given|following|adjoining|accompanying|above)\\s+${word}\\b`, "i")
];

const chartReferences = [...referencesTo(chartWord), /\b(?:pie|bar|line)[- ]?(?:chart|graph|diagram)\b/i, /\bhistogram\b/i];
const pictureReferences = [
  ...referencesTo(pictureWord),
  /\b(?:mirror|water)\s+image\b/i,
  /\bpaper\s+(?:folding|cutting)\b/i,
  /\bembedded\s+figure\b/i,
  /\bfigure\s+series\b/i,
  /\bvenn\s+diagram\b/i,
  /\bwhich\s+(?:one\s+of\s+the\s+)?(?:following\s+)?(?:figure|diagram|pattern)\b/i
];

const tableReferences = /\b(?:following|given|below|above)\s+table\b|\btable\s+(?:below|above|given|shows?|gives?|represents?)\b|\bin\s+the\s+table\b/i;

export type FigureContext = { hasChart?: boolean; hasTable?: boolean };

export function figureProblem(stem: string, options: Record<string, string>, context: FigureContext = {}): string | null {
  const text = [stem, ...Object.values(options)].join("\n");
  if (pictureReferences.some((pattern) => pattern.test(text))) return "The question depends on a figure, diagram or picture that learners cannot see. Rewrite it so it is fully answerable from text, or put the data in a text table.";
  if (!context.hasChart && chartReferences.some((pattern) => pattern.test(text))) return "The question depends on a graph or chart that is not included. Rewrite it so it is fully answerable from text, or put the data in a text table.";
  if (!context.hasTable && tableReferences.test(stem) && !hasTableBlock(stem)) return "The question refers to a table that is not included. Put the table in the question text, one row per line with | between cells.";
  return null;
}

const hasTableBlock = (text: string) => parseRichBlocks(text).some((block) => block.type === "table");
