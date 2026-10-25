export interface LlmProvider {
  id: string;
  model: string;
  // Returns the raw text of a JSON reply.
  completeJson(input: { system: string; prompt: string }): Promise<string>;
}

export class ProviderConfigError extends Error {}
