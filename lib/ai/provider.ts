// One narrow interface between the product and whichever AI provider answers. Swapping provider or model is a config change:
// AI_PROVIDER=anthropic (default when ANTHROPIC_API_KEY is set) or mock (canned replies for local work, no key or cost).
export type AiRequest = {
  model: string;
  system: Array<{ text: string; cache?: boolean }>;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  effort: "low" | "medium" | "high";
};
export type AiResult = { text: string; inputTokens: number; outputTokens: number };
export type AiProvider = (request: AiRequest) => Promise<AiResult>;

export const guideModels = () => ({
  fast: process.env.GUIDE_MODEL_FAST || "claude-haiku-5-5",
  deep: process.env.GUIDE_MODEL_DEEP || "claude-sonnet-5-5"
});

const anthropicProvider: AiProvider = async (request) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens,
      output_config: { effort: request.effort },
      system: request.system.map((block) => ({ type: "text", text: block.text, ...(block.cache ? { cache_control: { type: "ephemeral" } } : {}) })),
      messages: request.messages
    }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new Error(`AI request failed with ${response.status}`);
  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
  };
  if (data.stop_reason === "refusal") return { text: "I cannot help with that one. Ask me about your preparation, a topic or a question.", inputTokens: 0, outputTokens: 0 };
  const text = data.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("").trim();
  const usage = data.usage ?? {};
  return {
    text: text || "Sorry, I could not answer that. Please try again.",
    inputTokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    outputTokens: usage.output_tokens ?? 0
  };
};

const mockProvider: AiProvider = async (request) => {
  const last = request.messages.at(-1)?.content ?? "";
  return { text: `[Mock reply, ${request.model}] You asked: "${last.slice(0, 120)}". In production the AI answers using your results, your weakest topics and the exam pattern.`, inputTokens: 1200, outputTokens: 80 };
};

export function getProvider(): AiProvider | null {
  const choice = process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY ? "anthropic" : "");
  if (choice === "mock" && process.env.NODE_ENV !== "production") return mockProvider;
  if (choice === "anthropic" && process.env.ANTHROPIC_API_KEY) return anthropicProvider;
  return null;
}

export const aiAvailable = () => getProvider() !== null;
