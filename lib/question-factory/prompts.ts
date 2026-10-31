export const PROMPT_VERSION = "qf-v3";

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
      "- Stay inside the standard syllabus for this topic. No trick questions, no ambiguity.",
      contextBlock(input.context),
      numeric ? '- For every question add "verification_expression": a plain arithmetic expression (numbers, + - * / ^ and brackets only) whose value equals the number in the correct option, ignoring units and the words increase or decrease.' : "",
      'Return {"questions":[{"exam":"","tier":"","subject":"","topic":"","difficulty":"easy|moderate|hard","question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","explanation":"","estimated_time_seconds":60,"verification_expression":""}]}'
    ]
      .filter(Boolean)
      .join("\n")
  };
}

export function solverPrompt(question: string, options: Record<string, string>) {
  return {
    system: "You are an expert solving exam questions independently. Respond with JSON only.",
    prompt: `Solve this multiple choice question. Work it out yourself.\n\nQuestion: ${question}\nA) ${options.A}\nB) ${options.B}\nC) ${options.C}\nD) ${options.D}\n\nReturn {"answer":"A|B|C|D","reasoning":"short working","ambiguous":true|false} where ambiguous is true if more than one option could be argued correct or none is.`
  };
}

// One review task covers proofreading and the syllabus check, so a batch needs one round of AI answers for both.
export function reviewPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; question: string; options: Record<string, string>; explanation: string; syllabus?: string }) {
  return {
    system: "You are a senior paper-setter and proofreader preparing an Indian government exam paper. Fix wording only; never change what is asked, the numbers, or which option is correct. Respond with JSON only.",
    prompt: [
      `Exam: ${input.exam} ${input.tier}. Subject: ${input.subject}. Topic: ${input.topic}. Intended difficulty: ${input.difficulty}.`,
      input.syllabus ? `Official syllabus:\n${input.syllabus.slice(0, 3500)}` : "No syllabus text is on file; judge by the standard syllabus for this exam.",
      `Question: ${input.question}\nA) ${input.options.A}\nB) ${input.options.B}\nC) ${input.options.C}\nD) ${input.options.D}\nExplanation: ${input.explanation}`,
      'Return {"ok":true|false,"issues":["short description"],"question":"corrected question text","explanation":"corrected explanation text","steps_ok":true|false,"step_errors":["Step 2: what is wrong"],"in_syllabus":true|false,"level":"easier"|"as_expected"|"harder","reason":"one short sentence"}.',
      'Check the explanation line by line as a careful teacher: redo every calculation and every fact in it. steps_ok is false if ANY step has a wrong number, a wrong rule, a wrong fact, a skipped jump that hides an error, or if the working does not end at the marked answer. List each problem in step_errors. Do not fix a wrong step silently: report it.',
      'ok is false only if the wording is confusing in a way you cannot fix without changing the question. in_syllabus is false if the topic is outside the syllabus. level is "harder" only if clearly beyond the intended difficulty for this exam stage.',
      'Keep the explanation as separate labelled lines (Key idea, Step 1, Step 2, Answer, Why not the others, Shortcut), separated by \\n. Fix wording or a wrong step, but never merge the lines into one paragraph and never shorten it to a single sentence. If a required line is missing, add it.'
    ].join("\n\n")
  };
}

export function fixPrompt(input: { exam: string; tier: string; question: string; options: Record<string, string>; correct_answer: string; explanation: string; subject: string; topic: string; difficulty: string; reasons: string[] }) {
  const numeric = /quant/i.test(input.subject);
  return {
    system: "You are a senior question setter repairing a faulty exam question. Keep the same topic and difficulty. Respond with JSON only.",
    prompt: [
      `The question below failed checks: ${input.reasons.join("; ")}.`,
      "Repair it so exactly one option is correct and the wording is clear. If it cannot be saved, replace it with a fresh original question on the same topic.",
      `Question: ${input.question}\nA) ${input.options.A}\nB) ${input.options.B}\nC) ${input.options.C}\nD) ${input.options.D}\nMarked correct: ${input.correct_answer}\nExplanation: ${input.explanation}`,
      EXPLANATION_FORMAT,
      numeric ? 'Include "verification_expression": a plain arithmetic expression whose value equals the number in the correct option.' : "",
      `Return {"question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","explanation":"","estimated_time_seconds":60,"verification_expression":""} for ${input.exam} ${input.tier}, subject ${input.subject}, topic ${input.topic}, ${input.difficulty}.`
    ].filter(Boolean).join("\n\n")
  };
}
