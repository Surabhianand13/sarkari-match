export const PROMPT_VERSION = "qf-v2";

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
      "- The explanation shows the solution step by step.",
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
      'Return {"ok":true|false,"issues":["short description"],"question":"corrected question text","explanation":"corrected explanation text","in_syllabus":true|false,"level":"easier"|"as_expected"|"harder","reason":"one short sentence"}.',
      'ok is false only if the wording is confusing in a way you cannot fix without changing the question. in_syllabus is false if the topic is outside the syllabus. level is "harder" only if clearly beyond the intended difficulty for this exam stage.'
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
      numeric ? 'Include "verification_expression": a plain arithmetic expression whose value equals the number in the correct option.' : "",
      `Return {"question":"","options":{"A":"","B":"","C":"","D":""},"correct_answer":"A|B|C|D","explanation":"","estimated_time_seconds":60,"verification_expression":""} for ${input.exam} ${input.tier}, subject ${input.subject}, topic ${input.topic}, ${input.difficulty}.`
    ].filter(Boolean).join("\n\n")
  };
}
