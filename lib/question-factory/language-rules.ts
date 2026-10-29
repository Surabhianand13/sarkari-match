// Free spelling and wording checks that run before any AI proofreading. They only make changes that cannot alter a
// question's meaning: spacing, doubled words, a few common misspellings and a missing capital at the start.

const misspellings: Record<string, string> = {
  recieve: "receive", recieved: "received", seperate: "separate", seperately: "separately", occured: "occurred", occurence: "occurrence",
  definately: "definitely", wich: "which", adress: "address", acheive: "achieve", acheived: "achieved", begining: "beginning",
  calender: "calendar", commitee: "committee", enviroment: "environment", goverment: "government", independant: "independent",
  neccessary: "necessary", occassion: "occasion", perfomance: "performance", priviledge: "privilege", publically: "publicly",
  refering: "referring", relevent: "relevant", succesful: "successful", tommorow: "tomorrow", untill: "until", wether: "whether",
  percentge: "percentage", perimiter: "perimeter", diamter: "diameter", circumfrence: "circumference", quadrilatral: "quadrilateral"
};

export type ProofreadResult = { text: string; fixes: string[]; issues: string[] };

function matchCase(original: string, replacement: string) {
  return original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
}

function balanced(text: string) {
  const pairs: Array<[string, string]> = [["(", ")"], ["[", "]"], ["{", "}"]];
  if (pairs.some(([open, close]) => text.split(open).length !== text.split(close).length)) return false;
  return (text.match(/"/g) ?? []).length % 2 === 0;
}

// Options are often short values or names, so a leading capital is only forced on sentences (stems and explanations).
export function proofread(input: string, options: { capitalise?: boolean } = {}): ProofreadResult {
  const fixes: string[] = [];
  const issues: string[] = [];
  let text = input;

  const apply = (label: string, next: string) => {
    if (next !== text) {
      fixes.push(label);
      text = next;
    }
  };

  apply("extra spaces removed", text.replace(/[ \t]{2,}/g, " ").trim());
  apply("space before punctuation removed", text.replace(/\s+([,;:?!])/g, "$1").replace(/\s+\.(?!\d)/g, "."));
  apply("repeated word removed", text.replace(/\b([A-Za-z]{2,})\s+\1\b/gi, "$1"));
  apply("spelling corrected", text.replace(/\b[A-Za-z]+\b/g, (word) => {
    const fixed = misspellings[word.toLowerCase()];
    return fixed ? matchCase(word, fixed) : word;
  }));
  const first = text[0];
  if (options.capitalise !== false && first && first !== first.toUpperCase() && first === first.toLowerCase() && /[a-z]/.test(first)) apply("capital letter added", first.toUpperCase() + text.slice(1));

  if (!balanced(text)) issues.push("Brackets or quotation marks are not paired.");
  return { text, fixes, issues };
}
