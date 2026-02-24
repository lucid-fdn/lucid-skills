import type { PluginConfig, Notifier, NotifierType } from '../types/index.js';
import { SlackNotifier } from './slack.js';
import { WebhookNotifier } from './webhook.js';
import { EmailNotifier } from './email.js';

export function createNotifierRegistry(config: PluginConfig): Map<NotifierType, Notifier> {
  const registry = new Map<NotifierType, Notifier>();

  const notifiers: Notifier[] = [
    new SlackNotifier(config.slackWebhookUrl),
    new WebhookNotifier(config.alertWebhookUrl),
    new EmailNotifier({
      alertEmail: config.alertEmail,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      smtpPass: config.smtpPass,
    }),
  ];

  for (const n of notifiers) {
    if (n.isConfigured()) {
      registry.set(n.type, n);
    }
  }

  return registry;
}

export { SlackNotifier } from './slack.js';
export { WebhookNotifier } from './webhook.js';
export { EmailNotifier } from './email.js';
export { BaseNotifier } from './base.js';
