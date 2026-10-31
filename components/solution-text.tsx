import { Inline, RichTable } from "@/components/rich-text";
import { parseRichBlocks } from "@/lib/rich-text";

const label = /^(Key idea|Step \d+|Answer|Why not the others|Why|Shortcut|Remember)\s*:\s*/i;

// Shows a worked solution one line per part, with the label (Key idea, Step 1, Answer...) in bold. Tables and maths are drawn
// properly. Older one-line explanations still render as a single line.
export function SolutionText({ text }: { text: string }) {
  return (
    <div className="grid gap-1.5">
      {parseRichBlocks(text).map((block, blockIndex) => {
        if (block.type === "table") return <RichTable key={blockIndex} block={block} />;
        return block.text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => {
            const match = line.match(label);
            const option = /^\([A-D]\)\s/.test(line);
            return (
              <p key={`${blockIndex}-${index}`} className={option ? "pl-4" : undefined}>
                {match ? (
                  <>
                    <span className="font-black text-primary">{match[1]}: </span>
                    <Inline text={line.slice(match[0].length)} />
                  </>
                ) : (
                  <Inline text={line} />
                )}
              </p>
            );
          });
      })}
    </div>
  );
}
