import { anthropicProvider, geminiProvider, openaiProvider } from "./http";
import { ProviderConfigError, type LlmProvider } from "./types";

export type ProviderId = "anthropic" | "openai" | "gemini";

export const providerIds: ProviderId[] = ["anthropic", "openai", "gemini"];

export function createProvider(id: string, env = process.env): LlmProvider {
  if (id === "anthropic") return anthropicProvider(env);
  if (id === "openai") return openaiProvider(env);
  if (id === "gemini") return geminiProvider(env);
  throw new ProviderConfigError(`Unknown provider: ${id}`);
}

// Which providers are usable, without ever exposing a key.
export function providerStatus(env = process.env): Array<{ id: ProviderId; ready: boolean; model: string | null; note: string }> {
  return providerIds.map((id) => {
    try {
      const provider = createProvider(id, env);
      return { id, ready: true, model: provider.model, note: "Ready" };
    } catch (error) {
      return { id, ready: false, model: null, note: error instanceof Error ? error.message : "Not configured" };
    }
  });
}

export type { LlmProvider };
export { ProviderConfigError };
