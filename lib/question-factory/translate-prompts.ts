import { optionKeys } from "@/lib/tests/question-schema";

// Prompts for translating questions into Hindi for SSC-style papers. The English text is the source of truth.

export const HINDI_RULES = [
  "Write natural, exam-standard Hindi in Devanagari, the way SSC and other government exam papers are written in Hindi: clear, formal, and without hard Sanskritised words where a common word is used in papers (for example प्रतिशत, लाभ, हानि, ब्याज, अनुपात, औसत, चाल, दूरी, समय, क्षेत्रफल).",
  "Keep every number exactly as in the English text, written with the digits 0-9 (never Devanagari digits ०-९). Keep ₹, %, °, √, π, ×, ÷, ^ and _ notation and decimal points as they are.",
  "Keep the option letters A, B, C, D and the order of the options. An option that is only a number or a formula stays as it is, apart from translating its unit (km/h becomes किमी/घंटा, cm becomes सेमी, kg becomes किग्रा).",
  "Keep tables exactly: the same rows and columns, with | between cells and the |---| separator row. Translate the words in the cells, not the numbers.",
  "Names of people and places are written in Devanagari in their usual Hindi form. Do not add, remove or hint at anything: the meaning, the numbers and the correct answer must be identical to the English.",
  'Translate the solution line by line, keeping one line for each English line. Replace the labels with these Hindi labels: "Key idea:" becomes "मुख्य विचार:", "Step 1:" becomes "चरण 1:", "Answer:" becomes "उत्तर:" (keep the option letter in brackets, for example "उत्तर: (B) 15%"), "Why not the others:" becomes "अन्य विकल्प क्यों नहीं:", "Shortcut:" becomes "शॉर्टकट:".'
].join("\n");

export function translationPrompt(input: {
  question: string;
  options: Record<string, string>;
  explanation: string;
  correct: string;
  figure?: unknown;
  data?: string;
  reasons?: string[];
}) {
  const source = { question: input.question, options: Object.fromEntries(optionKeys.map((key) => [key, input.options[key]])), explanation: input.explanation, ...(input.figure ? { figure: input.figure } : {}) };
  return {
    system: "You are a senior Hindi translator who prepares bilingual (English and Hindi) government recruitment exam papers. You translate faithfully and never change a question's meaning, numbers or answer. Respond with JSON only.",
    prompt: [
      "Translate this multiple choice question, its options and its worked solution from English into Hindi.",
      HINDI_RULES,
      input.data ? `The question is shown with this data or passage (given for context only; it is translated separately, so do not translate it here):\n${input.data}` : "",
      input.figure ? 'The question has a figure described as JSON. Return the same JSON with only the words translated (title, set names and labels such as "5 cm" becoming "5 सेमी"). Keep every point name, position, count, number and every other field exactly as it is.' : "",
      input.reasons?.length ? `A previous translation was rejected for these reasons. Fix them: ${input.reasons.join("; ")}.` : "",
      `English source (the correct option is ${input.correct}):\n${JSON.stringify(source, null, 1)}`,
      `Return {"question":"","options":{"A":"","B":"","C":"","D":""},"explanation":""${input.figure ? ',"figure":{}' : ""}}`
    ].filter(Boolean).join("\n\n")
  };
}

export function setTranslationPrompt(input: { title: string; stimulus: string; chart?: unknown; reasons?: string[] }) {
  const source = { title: input.title, text: input.stimulus, ...(input.chart ? { chart: input.chart } : {}) };
  return {
    system: "You are a senior Hindi translator who prepares bilingual (English and Hindi) government recruitment exam papers. You translate faithfully and never change a number. Respond with JSON only.",
    prompt: [
      "Translate the title and text that several exam questions share (a table, a chart or a short passage) from English into Hindi.",
      HINDI_RULES,
      input.chart ? 'The set has a chart as JSON. Return the same JSON with only the words translated (title, unit, category names, series names). Keep the type, every "as" field and every number exactly as it is, in the same order.' : "",
      input.reasons?.length ? `A previous translation was rejected for these reasons. Fix them: ${input.reasons.join("; ")}.` : "",
      `English source:\n${JSON.stringify(source, null, 1)}`,
      `Return {"title":"","text":""${input.chart ? ',"chart":{}' : ""}}`
    ].filter(Boolean).join("\n\n")
  };
}
