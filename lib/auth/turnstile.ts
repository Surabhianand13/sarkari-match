// Cloudflare Turnstile (free bot check). Switched on only when TURNSTILE_SECRET_KEY is set; otherwise every request passes.
export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000)
    });
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // If Cloudflare cannot be reached, fail closed so bots cannot slip through during an outage.
    return false;
  }
}
