import { createHash } from "node:crypto";
import type { FigureSpec } from "@/lib/figure";

// Server only (it uses node:crypto), so lib/figure.ts stays safe to import from browser components.

// Same figure, same text, whatever order the database returned the keys in. Used to keep two different figures from looking like one question.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export const figureSeed = (figure: FigureSpec) => `figure:${createHash("sha256").update(canonical(figure)).digest("hex")}`;
