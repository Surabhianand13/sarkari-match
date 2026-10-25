export const PROMPT_VERSION = "qf-v1";

export function generationPrompt(input: { exam: string; tier: string; subject: string; topic: string; difficulty: string; count: number }) {
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
