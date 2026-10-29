import type { Db } from "@/lib/db";
import { apiAi, queueAi, rulesAi, type AiPort } from "./engine";
import { createProvider } from "./providers";

// Chooses who does the AI work for a run, from the mode stored when the run was started.
export function aiForConfig(db: Db, config: { mode?: string; provider?: string }): AiPort {
  if (config.mode === "queue") return queueAi(db);
  if (config.mode === "api") {
    if (!config.provider) throw new Error("This run has no AI provider set.");
    return apiAi(createProvider(config.provider));
  }
  return rulesAi;
}
