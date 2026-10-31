const label = /^(Key idea|Step \d+|Answer|Why not the others|Why|Shortcut|Remember)\s*:\s*/i;

// Shows a worked solution one line per part, with the label (Key idea, Step 1, Answer...) in bold.
// Older one-line explanations still render as a single line.
export function SolutionText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return (
    <div className="grid gap-1.5">
      {lines.map((line, index) => {
        const match = line.match(label);
        const option = /^\([A-D]\)\s/.test(line);
        return (
          <p key={index} className={option ? "pl-4" : undefined}>
            {match ? (
              <>
                <span className="font-black text-primary">{match[1]}: </span>
                {line.slice(match[0].length)}
              </>
            ) : (
              line
            )}
          </p>
        );
      })}
    </div>
  );
}
