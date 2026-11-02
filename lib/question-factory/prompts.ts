import { isNumericSubject } from "./validator";
import { isTimeSensitive } from "@/lib/freshness";

export const PROMPT_VERSION = "qf-v6";

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

// Learners see text only. Data goes in a text table, maths is plain Unicode, and nothing may depend on a picture, unless the
// question is shown with a figure, chart or table of its own (allowFigure).
export function richTextRules(allowFigure = false): string {
  return [
    allowFigure
      ? "Learners see text and tables, plus the figure, chart or table that is shown with the question. A question may refer to its own figure, chart or table, but must never depend on any other picture: no photos, mirror or water images, paper folding or figure series."
      : "Learners see text only. Never write a question that needs a figure, diagram, graph, chart, picture or image: no \"in the figure\", pie or bar charts, Venn diagrams, mirror or water images, paper folding or figure series.",
    "When a question needs data, put it in the question as a table, one row per line (separate lines with \\n inside the JSON string), with | between cells and a separator row, for example:",
    "| Year | Sales | Profit |\\n|---|---|---|\\n| 2019 | 120 | 20 |\\n| 2020 | 150 | 30 |",
    "Use at most 6 data rows and 5 columns with simple numbers, and put the question sentence after the table. Options are always one line of plain text, never a table.",
    "Write maths in plain Unicode: √ π ° × ÷ ≤ ≥ ≠ ∠ ² ³ and fractions as a/b, with brackets where needed, such as (a + b)/c. For other powers and subscripts use ^ and _ : x^2, 2^{n+1}, a_1, a_{n+1}. Never use LaTeX, backslash commands or dollar signs."
  ].join("\n");
}

export const RICH_TEXT_RULES = richTextRules(false);

// A question may carry one drawn figure. It is a description, not a picture: the site draws it and the checkers read it as text.
export const FIGURE_RULES = [
  'Optional figure. Add one only when the question truly needs a Venn diagram or a geometry figure; otherwise set "figure" to null. The site draws it above the question, so the question may say "in the figure" or "in the Venn diagram". Every number the solver needs must be in the figure labels or counts, or in the question text. Never put the answer in the figure.',
  'Venn (two or three sets): {"type":"venn","title":"","sets":["Cricket","Football"],"counts":{"1":12,"2":8,"12":5,"none":4}}. In counts, "1" is only the first set, "2" only the second, "12" both; with three sets "3", "13", "23" and "123" work the same way (all three together is "123"). "none" is outside every set. Give a whole-number count for every region, and use null for the one region the question asks about.',
  'Geometry: {"type":"geometry","title":"","points":[{"name":"A","x":10,"y":10},{"name":"B","x":90,"y":10},{"name":"C","x":10,"y":70}],"lines":[{"from":"A","to":"B","label":"12 cm"}],"circles":[{"center":"O","radius":30,"label":"r = 7 cm"}],"angles":[{"at":"A","from":"B","to":"C","label":"90°"}]}. x runs left to right and y bottom to top, both from 0 to 100. Name points with capital letters, at most 8 points, at least 10 apart. Draw the points to roughly match the labels: an angle labelled 90° must look like a right angle (within 25°). Keep it simple: triangles, quadrilaterals, circles with a chord or tangent, parallel lines. Label only what the question gives. A circle\'s centre must also be one of the listed points.',
  "No other picture is possible: no mirror or water images, paper folding, figure series, or pie and bar charts (use a table)."
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

// Rules for questions whose answer can go out of date. The writer may only use the notes it is given, and must say which note and when.
function currentAffairsRules(hasNotes: boolean) {
  return hasNotes
    ? [
        "Current affairs rules:",
        "- Use ONLY facts stated in the source notes given above. Never use a fact from your own memory, even if you are sure of it.",
        '- Every question carries "source" (the title of the note it comes from, exactly as in that note\'s [Source: ...] header) and "as_of" (the month the fact is from, as YYYY-MM: the month of the event in the note, or the note\'s own month). Learners are shown this month with the question.',
        '- Ask about a specific event, not about "the latest", "the current" or "recently", because the reader is shown the month the fact is from.'
      ].join("\n")
    : "Current affairs rules: no source notes are on file for this exam, so write only settled facts that will not change and leave \"source\" and \"as_of\" empty. A person will check every question.";
}

export function generationPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; count: number; figures?: boolean; context?: PromptContext }) {
  const numeric = isNumericSubject(input.subject);
  const dated = isTimeSensitive(input.subject, input.topic);
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
      richTextRules(Boolean(input.figures)),
      input.figures ? FIGURE_RULES : "",
      "- Stay inside the standard syllabus for this topic. No trick questions, no ambiguity.",
      contextBlock(input.context),
      dated ? currentAffairsRules(Boolean(input.context?.currentAffairs)) : "",
      numeric ? '- For every question add "verification_expression": a plain arithmetic expression (numbers, + - * / ^ and brackets only) whose value equals the number in the correct option, ignoring units and the words increase or decrease.' : "",
      `Return {"questions":[{"exam":"","tier":"","subject":"","topic":"","difficulty":"easy|moderate|hard","question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","explanation":"","estimated_time_seconds":60,"verification_expression":""${input.figures ? ',"figure":null' : ""}${dated ? ',"source":"","as_of":"YYYY-MM"' : ""}}]}`
    ]
      .filter(Boolean)
      .join("\n")
  };
}

const dataBlock = (data?: string) => (data ? `Data or figure shown with the question (a table, chart, passage or diagram, given here as text; diagrams are not drawn to scale):\n${data}\n\n` : "");

export function solverPrompt(question: string, options: Record<string, string>, data?: string) {
  return {
    system: "You are an expert solving exam questions independently. Respond with JSON only.",
    prompt: `Solve this multiple choice question. Work it out yourself.\n\n${dataBlock(data)}Question: ${question}\nA) ${options.A}\nB) ${options.B}\nC) ${options.C}\nD) ${options.D}\n\nReturn {"answer":"A|B|C|D","reasoning":"short working","ambiguous":true|false} where ambiguous is true if more than one option could be argued correct or none is.`
  };
}

// One review task covers proofreading and the syllabus check, so a batch needs one round of AI answers for both.
export function reviewPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; question: string; options: Record<string, string>; explanation: string; syllabus?: string; data?: string; facts?: string }) {
  return {
    system: "You are a senior paper-setter and proofreader preparing an Indian government exam paper. Fix wording only; never change what is asked, the numbers, or which option is correct. Respond with JSON only.",
    prompt: [
      `Exam: ${input.exam} ${input.tier}. Subject: ${input.subject}. Topic: ${input.topic}. Intended difficulty: ${input.difficulty}.`,
      input.syllabus ? `Official syllabus:\n${input.syllabus.slice(0, 3500)}` : "No syllabus text is on file; judge by the standard syllabus for this exam.",
      `${dataBlock(input.data)}Question: ${input.question}\nA) ${input.options.A}\nB) ${input.options.B}\nC) ${input.options.C}\nD) ${input.options.D}\nExplanation: ${input.explanation}`,
      'Return {"ok":true|false,"issues":["short description"],"question":"corrected question text","explanation":"corrected explanation text","steps_ok":true|false,"step_errors":["Step 2: what is wrong"],"in_syllabus":true|false,"level":"easier"|"as_expected"|"harder","reason":"one short sentence"}.',
      'Check the explanation line by line as a careful teacher: redo every calculation and every fact in it. steps_ok is false if ANY step has a wrong number, a wrong rule, a wrong fact, a skipped jump that hides an error, or if the working does not end at the marked answer. List each problem in step_errors. Do not fix a wrong step silently: report it.',
      'ok is false only if the wording is confusing in a way you cannot fix without changing the question. in_syllabus is false if the topic is outside the syllabus. level is "harder" only if clearly beyond the intended difficulty for this exam stage.',
      "Keep any table and the maths notation exactly as written (| rows, ^ and _), and never merge a table into a sentence. Flag a question that depends on a figure, graph or picture that is not given above as not ok, because learners cannot see one. Data or a figure given above is shown to learners, so the question may refer to it.",
      input.facts ? `Source note this question was written from. It is the only authority: the keyed answer must be stated in it.\n${input.facts}\nAdd "supported": true only if the note itself states the keyed answer, otherwise false, and "evidence": a short quote from the note that proves it (empty if none).` : "",
      'Keep the explanation as separate labelled lines (Key idea, Step 1, Step 2, Answer, Why not the others, Shortcut), separated by \\n. Fix wording or a wrong step, but never merge the lines into one paragraph and never shorten it to a single sentence. If a required line is missing, add it.'
    ].join("\n\n")
  };
}

export function fixPrompt(input: { exam: string; tier: string; question: string; options: Record<string, string>; correct_answer: string; explanation: string; subject: string; topic: string; difficulty: string; reasons: string[]; explanationOnly?: boolean; data?: string; facts?: string }) {
  const numeric = isNumericSubject(input.subject);
  return {
    system: "You are a senior question setter repairing a faulty exam question. Keep the same topic and difficulty. Respond with JSON only.",
    prompt: [
      `The question below failed checks: ${input.reasons.join("; ")}.`,
      input.explanationOnly
        ? `Only the explanation needs work. Keep the question, the four options and the marked correct answer (${input.correct_answer}) exactly as they are, and rewrite only the explanation so every step is correct and it ends at the marked answer.`
        : "Repair it so exactly one option is correct and the wording is clear. If it cannot be saved, replace it with a fresh original question on the same topic.",
      input.facts ? `This question must stay inside this source note, the only facts you may use:\n${input.facts}` : "",
      input.data ? `This question is shown with the data or figure below. It is fixed: do not change it, keep the question about it, and make every number you use come from it.\n${input.data}` : "",
      `Question: ${input.question}\nA) ${input.options.A}\nB) ${input.options.B}\nC) ${input.options.C}\nD) ${input.options.D}\nMarked correct: ${input.correct_answer}\nExplanation: ${input.explanation}`,
      EXPLANATION_FORMAT,
      richTextRules(Boolean(input.data)),
      numeric ? 'Include "verification_expression": a plain arithmetic expression whose value equals the number in the correct option.' : "",
      `Return {"question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","explanation":"","estimated_time_seconds":60,"verification_expression":""} for ${input.exam} ${input.tier}, subject ${input.subject}, topic ${input.topic}, ${input.difficulty}.`
    ].filter(Boolean).join("\n\n")
  };
}

export type SetKind = "table" | "bar" | "line" | "pie" | "stacked" | "histogram" | "combo" | "mixed" | "passage" | "cloze";
const chartNames = { bar: "bar chart", line: "line graph", pie: "pie chart", stacked: "stacked bar chart", histogram: "histogram", combo: "combined bar-and-line chart" } as const;
export const isPassageKind = (kind: SetKind | undefined): kind is "passage" | "cloze" => kind === "passage" || kind === "cloze";
export const QUESTIONS_PER_SET = 5;

// A data set: one table or chart and several questions that can only be answered by reading it.
// A passage set: one original passage (or a cloze passage with numbered blanks) and five questions that can only be answered from it.
function generationPassagePrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; sets: number; kind: "passage" | "cloze"; context?: PromptContext }) {
  const cloze = input.kind === "cloze";
  return {
    system:
      "You are a senior English-language question setter for Indian government recruitment exams. You write original passages and unambiguous multiple choice questions about them. " +
      "Never reproduce or closely paraphrase a published passage, a newspaper article or a coaching institute's material. Respond with JSON only.",
    prompt: [
      `Write ${input.sets} original ${input.difficulty} ${cloze ? "cloze test" : "reading comprehension"} sets for ${input.exam} ${input.tier}.`,
      `Subject: ${input.subject}. Topic: ${input.topic}.`,
      `Each set has one passage and exactly ${QUESTIONS_PER_SET} multiple choice questions about it.`,
      cloze
        ? 'The passage is 100 to 140 words of connected prose with exactly five numbered blanks written as (1) ______ , (2) ______ and so on up to (5) ______. Question n is always "Select the most appropriate option to fill in blank (n)." Test grammar, vocabulary and collocation. Exactly one option fits the blank and the sentence around it.'
        : "The passage is 170 to 230 words in two or three paragraphs (separate paragraphs with \\n\\n inside the JSON string). Use neutral, informative or discursive prose about an everyday, social, scientific or economic theme, with no real people, quotations or facts that need outside checking. Every question must be answerable from the passage alone.",
      cloze
        ? "- Write each explanation so that Step 1 reads the sentence around the blank and names what it needs (a tense, a preposition, a word meaning)."
        : "- Mix the five questions: the main idea or best title, a detail stated in the passage, an inference, the meaning of a word as used in the passage, and the writer's tone or purpose. Do not number the questions in their text.\n- Step 1 of every explanation quotes the short part of the passage that settles the answer.",
      "- Four options A, B, C, D. Exactly one correct. Distractors are plausible: true-sounding but unsupported, too extreme, or partly right.",
      EXPLANATION_FORMAT,
      RICH_TEXT_RULES,
      input.context ? contextBlock(input.context) : "",
      `Return {"sets":[{"title":"short title","passage":"the full passage text","questions":[{"question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","difficulty":"easy|moderate|hard","explanation":"","estimated_time_seconds":${cloze ? 40 : 75}}]}]}`
    ]
      .filter(Boolean)
      .join("\n")
  };
}

export function generationSetPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; sets: number; kind: SetKind; context?: PromptContext }) {
  if (isPassageKind(input.kind)) return generationPassagePrompt({ ...input, kind: input.kind });
  const kindRule =
    input.kind === "table"
      ? 'Every set shows its data as a text table in "table" and has "chart": null.'
      : input.kind === "mixed"
        ? 'Vary the data: give some sets a text table in "table" (with "chart": null) and others a chart in "chart" (with "table": null), choosing bar, line, pie, stacked, histogram or combo to suit the data.'
        : `Every set shows its data as a ${chartNames[input.kind as keyof typeof chartNames]} in "chart" (with "table": null).`;
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
      'A chart is an object: {"type":"bar"|"line"|"pie"|"stacked"|"histogram"|"combo","title":"","unit":"","categories":["2019","2020"],"series":[{"name":"","values":[120,150]}]}. Use 4 to 6 categories and at most 3 series. Category and series names are short (under 12 characters). Values are plain numbers, not strings.',
      'A pie chart has exactly one series. A stacked chart has two or three series that are piled on top of each other, so the questions can ask about parts and totals. A histogram has exactly one series of frequencies and its categories are class intervals such as "10-20", "20-30". A combo chart draws some series as bars and others as a line: give every series "as":"bar" or "as":"line", with at least one of each (for example sales as bars and profit percent as a line).',
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
