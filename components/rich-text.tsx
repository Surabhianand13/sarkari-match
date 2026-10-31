import { parseInline, parseRichBlocks, type RichBlock } from "@/lib/rich-text";

// One line of text with powers and subscripts drawn properly (x^2, a_1).
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) => (part.kind === "sup" ? <sup key={index}>{part.text}</sup> : part.kind === "sub" ? <sub key={index}>{part.text}</sub> : <span key={index}>{part.text}</span>))}
    </>
  );
}

export function RichTable({ block }: { block: Extract<RichBlock, { type: "table" }> }) {
  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-left text-base font-semibold">
        <thead>
          <tr>
            {block.header.map((cell, index) => (
              <th key={index} scope="col" className="border border-border bg-surface px-3 py-2 font-black text-primary"><Inline text={cell} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {block.header.map((_, index) => (
                <td key={index} className="border border-border px-3 py-2"><Inline text={row[index] ?? ""} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A question's text: paragraphs, tables and maths. Plain text with no tables renders as it always did.
export function Rich({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parseRichBlocks(text).map((block, index) =>
        block.type === "table" ? <RichTable key={index} block={block} /> : <p key={index} className="whitespace-pre-line"><Inline text={block.text} /></p>
      )}
    </div>
  );
}
