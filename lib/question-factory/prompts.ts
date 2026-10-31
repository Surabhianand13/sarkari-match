export const PROMPT_VERSION = "qf-v5";

// Every explanation uses this layout, one labelled line per part, so the learner sees a worked solution instead of a sentence.
export const EXPLANATION_FORMAT = [
  'The "explanation" is a worked solution for a learner who got it wrong. Write each part on its own line (separate lines with \\n inside the JSON string) using these labels:',
  "Key idea: the rule, formula or fact the question tests, in one line.",
  "Step 1: / Step 2: / Step 3: ... each step on its own line with the actual numbers or reasoning (at least two steps for calculations; for facts, give the context that proves the answer).",
  "Answer: the correct option letter and its value, for example (B) 15%.",
  "Why not the others: one short line per wrong option saying what mistake leads to it, for example (A) 12% uses the selling price as the base.",
  "Shortcut: a faster method, only when a real one exists.",
  "Keep it plain and exact. No filler, no repeating the question, no markdown symbols."
].join("\n");

// Learners see text only. Data goes in a text table, maths is plain Unicode, and nothing may depend on a picture.
export const RICH_TEXT_RULES = [
  "Learners see text only. Never write a question that needs a figure, diagram, graph, chart, picture or image: no \"in the figure\", pie or bar charts, Venn diagrams, mirror or water images, paper folding or figure series.",
  "When a question needs data, put it in the question as a table, one row per line (separate lines with \\n inside the JSON string), with | between cells and a separator row, for example:",
  "| Year | Sales | Profit |\\n|---|---|---|\\n| 2019 | 120 | 20 |\\n| 2020 | 150 | 30 |",
  "Use at most 6 data rows and 5 columns with simple numbers, and put the question sentence after the table. Options are always one line of plain text, never a table.",
  "Write maths in plain Unicode: √ π ° × ÷ ≤ ≥ ≠ ∠ ² ³ and fractions as a/b, with brackets where needed, such as (a + b)/c. For other powers and subscripts use ^ and _ : x^2, 2^{n+1}, a_1, a_{n+1}. Never use LaTeX, backslash commands or dollar signs."
].join("\n");

export type PromptContext = { syllabus?: string; currentAffairs?: string; pyqSamples?: string[] };

function contextBlock(context?: PromptContext) {
  if (!context) return "";
  const parts: string[] = [];
  if (context.syllabus) parts.push(`Official syllabus (stay inside it):\n${context.syllabus.slice(0, 3500)}`);
  if (context.currentAffairs) parts.push(`Current affairs notes (use for facts, do not invent others):\n${context.currentAffairs.slice(0, 3500)}`);
  if (context.pyqSamples?.length) parts.push(`Past paper questions, shown only so you match the style and difficulty. Never copy or lightly reword them:\n${context.pyqSamples.map((sample, index) => `${index + 1}. ${sample}`).join("\n")}`);
  return parts.join("\n\n");
}

export function generationPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; count: number; context?: PromptContext }) {
  const numeric = /quant/i.test(input.subject);
  return {
    system:
      "You are a senior question setter for Indian government recruitment exams. You write original, unambiguous multiple choice questions with exactly one correct option. " +
      "Never reproduce or paraphrase a question from a real past paper or a coaching institute. Respond with JSON only.",
    prompt: [
      `Write ${input.count} original ${input.difficulty} MCQs for ${input.exam} ${input.tier}.`,
      `Subject: ${input.subject}. Topic: ${input.topic}.`,
      "Rules:",
      "- Four options A, B, C, D. Exactly one correct. Distractors must be plausible results of common mistakes.",
      "- The correct option must not be guessable from option length or position. Vary the correct letter.",
      EXPLANATION_FORMAT,
      RICH_TEXT_RULES,
      "- Stay inside the standard syllabus for this topic. No trick questions, no ambiguity.",
      contextBlock(input.context),
      numeric ? '- For every question add "verification_expression": a plain arithmetic expression (numbers, + - * / ^ and brackets only) whose value equals the number in the correct option, ignoring units and the words increase or decrease.' : "",
      'Return {"questions":[{"exam":"","tier":"","subject":"","topic":"","difficulty":"easy|moderate|hard","question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","explanation":"","estimated_time_seconds":60,"verification_expression":""}]}'
    ]
      .filter(Boolean)
      .join("\n")
  };
}

const dataBlock = (data?: string) => (data ? `Data shown with the question (a table or chart, given here as text):\n${data}\n\n` : "");

export function solverPrompt(question: string, options: Record<string, string>, data?: string) {
  return {
    system: "You are an expert solving exam questions independently. Respond with JSON only.",
    prompt: `Solve this multiple choice question. Work it out yourself.\n\n${dataBlock(data)}Question: ${question}\nA) ${options.A}\nB) ${options.B}\nC) ${options.C}\nD) ${options.D}\n\nReturn {"answer":"A|B|C|D","reasoning":"short working","ambiguous":true|false} where ambiguous is true if more than one option could be argued correct or none is.`
  };
}

// One review task covers proofreading and the syllabus check, so a batch needs one round of AI answers for both.
export function reviewPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; question: string; options: Record<string, string>; explanation: string; syllabus?: string; data?: string }) {
  return {
    system: "You are a senior paper-setter and proofreader preparing an Indian government exam paper. Fix wording only; never change what is asked, the numbers, or which option is correct. Respond with JSON only.",
    prompt: [
      `Exam: ${input.exam} ${input.tier}. Subject: ${input.subject}. Topic: ${input.topic}. Intended difficulty: ${input.difficulty}.`,
      input.syllabus ? `Official syllabus:\n${input.syllabus.slice(0, 3500)}` : "No syllabus text is on file; judge by the standard syllabus for this exam.",
      `${dataBlock(input.data)}Question: ${input.question}\nA) ${input.options.A}\nB) ${input.options.B}\nC) ${input.options.C}\nD) ${input.options.D}\nExplanation: ${input.explanation}`,
      'Return {"ok":true|false,"issues":["short description"],"question":"corrected question text","explanation":"corrected explanation text","steps_ok":true|false,"step_errors":["Step 2: what is wrong"],"in_syllabus":true|false,"level":"easier"|"as_expected"|"harder","reason":"one short sentence"}.',
      'Check the explanation line by line as a careful teacher: redo every calculation and every fact in it. steps_ok is false if ANY step has a wrong number, a wrong rule, a wrong fact, a skipped jump that hides an error, or if the working does not end at the marked answer. List each problem in step_errors. Do not fix a wrong step silently: report it.',
      'ok is false only if the wording is confusing in a way you cannot fix without changing the question. in_syllabus is false if the topic is outside the syllabus. level is "harder" only if clearly beyond the intended difficulty for this exam stage.',
      "Keep any table and the maths notation exactly as written (| rows, ^ and _), and never merge a table into a sentence. Flag a question that depends on a figure, graph or picture as not ok, because learners cannot see one.",
      'Keep the explanation as separate labelled lines (Key idea, Step 1, Step 2, Answer, Why not the others, Shortcut), separated by \\n. Fix wording or a wrong step, but never merge the lines into one paragraph and never shorten it to a single sentence. If a required line is missing, add it.'
    ].join("\n\n")
  };
}

export function fixPrompt(input: { exam: string; tier: string; question: string; options: Record<string, string>; correct_answer: string; explanation: string; subject: string; topic: string; difficulty: string; reasons: string[]; explanationOnly?: boolean; data?: string }) {
  const numeric = /quant/i.test(input.subject);
  return {
    system: "You are a senior question setter repairing a faulty exam question. Keep the same topic and difficulty. Respond with JSON only.",
    prompt: [
      `The question below failed checks: ${input.reasons.join("; ")}.`,
      input.explanationOnly
        ? `Only the explanation needs work. Keep the question, the four options and the marked correct answer (${input.correct_answer}) exactly as they are, and rewrite only the explanation so every step is correct and it ends at the marked answer.`
        : "Repair it so exactly one option is correct and the wording is clear. If it cannot be saved, replace it with a fresh original question on the same topic.",
      input.data ? `This question belongs to a data set. The data below is fixed: do not change it, and make every number you use come from it.\n${input.data}` : "",
      `Question: ${input.question}\nA) ${input.options.A}\nB) ${input.options.B}\nC) ${input.options.C}\nD) ${input.options.D}\nMarked correct: ${input.correct_answer}\nExplanation: ${input.explanation}`,
      EXPLANATION_FORMAT,
      RICH_TEXT_RULES,
      numeric ? 'Include "verification_expression": a plain arithmetic expression whose value equals the number in the correct option.' : "",
      `Return {"question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","explanation":"","estimated_time_seconds":60,"verification_expression":""} for ${input.exam} ${input.tier}, subject ${input.subject}, topic ${input.topic}, ${input.difficulty}.`
    ].filter(Boolean).join("\n\n")
  };
}

export type SetKind = "table" | "bar" | "line" | "pie" | "mixed";
export const QUESTIONS_PER_SET = 5;

// A data set: one table or chart and several questions that can only be answered by reading it.
export function generationSetPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; sets: number; kind: SetKind; context?: PromptContext }) {
  const kindRule =
    input.kind === "table"
      ? 'Every set shows its data as a text table in "table" and has "chart": null.'
      : input.kind === "mixed"
        ? 'Vary the data: give some sets a text table in "table" (with "chart": null) and others a chart in "chart" (with "table": null), choosing bar, line or pie to suit the data.'
        : `Every set shows its data as a ${input.kind} chart in "chart" (with "table": null).`;
  return {
    system:
      "You are a senior question setter for Indian government recruitment exams. You write original, unambiguous Data Interpretation sets: one data source followed by questions that can only be answered by reading it. " +
      "Never reproduce a real past paper or a coaching institute's set. Respond with JSON only.",
    prompt: [
      `Write ${input.sets} original ${input.difficulty} Data Interpretation sets for ${input.exam} ${input.tier}.`,
      `Subject: ${input.subject}. Topic: ${input.topic}.`,
      `Each set has one data source and exactly ${QUESTIONS_PER_SET} multiple choice questions about it.`,
      kindRule,
      'A table is text: a header row, a separator row, then data rows, with | between cells (separate lines with \\n inside the JSON string), at most 6 data rows and 5 columns.',
      'A chart is an object: {"type":"bar"|"line"|"pie","title":"","unit":"","categories":["2019","2020"],"series":[{"name":"","values":[120,150]}]}. Use 4 to 6 categories and at most 3 series. A pie chart has exactly one series. Category and series names are short (under 12 characters). Values are plain numbers, not strings.',
      "Make the numbers realistic and simple (multiples of 5 or 10, totals that give clean percentages) so answers are exact.",
      "Rules for the questions:",
      "- Each question must need the data, and the five together must use different calculations: percentage change, ratio, average, difference, share of the total, comparison.",
      "- A question may say \"the data above\", \"the table\" or \"the chart\". It must never state a number that the data already shows as if it were new, and must not give away its own answer.",
      "- Four options A, B, C, D. Exactly one correct. Distractors are plausible results of common slips.",
      "- The first step of every explanation reads the values from the data, for example \"Step 1: From the data, 2019 = 120 and 2020 = 150.\"",
      'For every question add "verification_expression": a plain arithmetic expression (numbers, + - * / ^ and brackets only) built from the values in the data, whose value equals the number in the correct option, ignoring units.',
      EXPLANATION_FORMAT,
      RICH_TEXT_RULES,
      input.context ? contextBlock(input.context) : "",
      'Return {"sets":[{"title":"short name of the data","intro":"one or two sentences saying what the data shows","table":"| ... |\\n|---|\\n| ... |" or null,"chart":{...} or null,"questions":[{"question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","difficulty":"easy|moderate|hard","explanation":"","estimated_time_seconds":75,"verification_expression":""}]}]}'
    ]
      .filter(Boolean)
      .join("\n")
  };
}
