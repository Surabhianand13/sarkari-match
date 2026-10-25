import type { LlmProvider } from "./providers/types";

// Deterministic stand-ins used by tests and by dry runs without API keys.
export function mockGenerator(questions: unknown[]): LlmProvider {
  return { id: "mock", model: "mock-generator", completeJson: async () => JSON.stringify({ questions }) };
}

export function mockSolver(answerFor: (question: string) => string, extras: { ambiguous?: boolean } = {}): LlmProvider {
  return {
    id: "mock",
    model: "mock-solver",
    completeJson: async ({ prompt }) => {
      const question = /Question: (.*)\n/.exec(prompt)?.[1] ?? "";
      return JSON.stringify({ answer: answerFor(question), reasoning: "mock", ambiguous: Boolean(extras.ambiguous) });
    }
  };
}
