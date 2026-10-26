// Only same-site paths are accepted as a post-login destination, so the login page cannot be used for open redirects.
export function safeNextPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
