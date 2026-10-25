import type { LlmProvider } from "./types";
import { ProviderConfigError } from "./types";

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`provider_http_${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

export function anthropicProvider(env = process.env): LlmProvider {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new ProviderConfigError("ANTHROPIC_API_KEY is not set");
  const model = env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
  return {
    id: "anthropic",
    model,
    async completeJson({ system, prompt }) {
      const data = await post("https://api.anthropic.com/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" }, { model, max_tokens: 8000, system, messages: [{ role: "user", content: prompt }] });
      return String(data?.content?.[0]?.text ?? "");
    }
  };
}

export function openaiProvider(env = process.env): LlmProvider {
  const key = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL;
  if (!key) throw new ProviderConfigError("OPENAI_API_KEY is not set");
  if (!model) throw new ProviderConfigError("OPENAI_MODEL is not set (choose the model you want to use)");
  return {
    id: "openai",
    model,
    async completeJson({ system, prompt }) {
      const data = await post("https://api.openai.com/v1/chat/completions", { Authorization: `Bearer ${key}` }, { model, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] });
      return String(data?.choices?.[0]?.message?.content ?? "");
    }
  };
}

export function geminiProvider(env = process.env): LlmProvider {
  const key = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL;
  if (!key) throw new ProviderConfigError("GEMINI_API_KEY is not set");
  if (!model) throw new ProviderConfigError("GEMINI_MODEL is not set (choose the model you want to use)");
  return {
    id: "gemini",
    model,
    async completeJson({ system, prompt }) {
      const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {}, {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      return String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
    }
  };
}
