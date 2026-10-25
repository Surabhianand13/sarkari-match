import type { Route } from "next";
import { redirect } from "next/navigation";

// Redirect to a runtime-built admin path (typed routes cannot check query strings or ids).
export function goTo(path: string): never {
  return redirect(path as Route);
}

export function withMessage(path: string, kind: "notice" | "error", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${kind}=${encodeURIComponent(message)}`;
}
