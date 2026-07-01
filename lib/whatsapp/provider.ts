export type WhatsAppTemplateMessage = {
  to: string;
  templateName: string;
  languageCode: string;
  variables: Record<string, string | number>;
};

export type WhatsAppJobAlert = {
  to: string;
  jobTitle: string;
  lastDate: string;
  officialUrl: string;
};

export interface WhatsAppProvider {
  sendTemplateMessage(message: WhatsAppTemplateMessage): Promise<{ id: string; skipped?: boolean }>;
  sendJobAlert(alert: WhatsAppJobAlert): Promise<{ id: string; skipped?: boolean }>;
  sendDeadlineReminder(alert: WhatsAppJobAlert): Promise<{ id: string; skipped?: boolean }>;
}

export class DevelopmentWhatsAppProvider implements WhatsAppProvider {
  async sendTemplateMessage(message: WhatsAppTemplateMessage) {
    return { id: `dev_whatsapp_${message.templateName}_${message.to}`, skipped: true };
  }

  async sendJobAlert(alert: WhatsAppJobAlert) {
    return { id: `dev_whatsapp_job_${alert.to}`, skipped: true };
  }

  async sendDeadlineReminder(alert: WhatsAppJobAlert) {
    return { id: `dev_whatsapp_deadline_${alert.to}`, skipped: true };
  }
}

export function createWhatsAppProvider(): WhatsAppProvider {
  return new DevelopmentWhatsAppProvider();
}

export function isWhatsAppEnabled(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return env.NEXT_PUBLIC_ENABLE_WHATSAPP === "true";
}
