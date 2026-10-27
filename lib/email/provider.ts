export type EmailTemplate =
  | "welcome"
  | "login_otp"
  | "new_strong_matches"
  | "daily_digest"
  | "weekly_digest"
  | "closing_soon_reminder"
  | "saved_job_change"
  | "payment_success"
  | "subscription_activated"
  | "subscription_cancelled";

export type EmailMessage = {
  to: string;
  template: EmailTemplate;
  subject: string;
  data: Record<string, string | number | boolean>;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string; skipped?: boolean }>;
}

export class DevelopmentEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    return { id: `dev_${message.template}_${message.to}`, skipped: true };
  }
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string, private readonly from: string, private readonly replyTo?: string) {}

  async send(message: EmailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        reply_to: this.replyTo,
        subject: message.subject,
        html: renderEmailHtml(message)
      })
    });
    if (!response.ok) throw new Error(`resend_send_failed_${response.status}`);
    const json = (await response.json()) as { id?: string };
    return { id: json.id ?? `resend_${Date.now()}` };
  }
}

// True when emails are really sent. In development the codes are printed to the console, so sign-in by code stays usable there.
export function emailAvailable(env = process.env) {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM) || env.NODE_ENV !== "production";
}

export function createEmailProvider(env = process.env): EmailProvider {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM, env.EMAIL_REPLY_TO);
  }
  return new DevelopmentEmailProvider();
}

function renderEmailHtml(message: EmailMessage) {
  const rows = Object.entries(message.data)
    .map(([key, value]) => `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}</p>`)
    .join("");
  return `<main><h1>${escapeHtml(message.subject)}</h1>${rows}<p>SarkariMatch is an independent information platform. Verify official notifications before applying.</p></main>`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
