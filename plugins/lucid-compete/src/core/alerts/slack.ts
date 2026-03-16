import { BaseNotifier } from './base.js';
import type { AlertPayload, NotifierType } from '../types/index.js';
import { log } from '../utils/logger.js';
import { AlertError } from '../utils/errors.js';

export class SlackNotifier extends BaseNotifier {
  readonly type: NotifierType = 'slack';
  readonly name = 'Slack Webhook';
  private webhookUrl?: string;

  constructor(webhookUrl?: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  async notify(payload: AlertPayload): Promise<void> {
    if (!this.webhookUrl) return;

    const severityEmoji: Record<string, string> = {
      critical: '\u{1F534}', high: '\u{1F7E0}', medium: '\u{1F7E1}', low: '\u{1F7E2}'
    };

    const body = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${severityEmoji[payload.signal.severity] ?? '\u26AA'} Competitive Signal: ${payload.signal.severity.toUpperCase()}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${payload.competitor.name}*\n${payload.signal.title}` },
        },
        ...(payload.signal.summary ? [{
          type: 'section' as const,
          text: { type: 'mrkdwn' as const, text: payload.signal.summary },
        }] : []),
        ...(payload.signal.url ? [{
          type: 'actions' as const,
          elements: [{ type: 'button', text: { type: 'plain_text', text: 'View Source' }, url: payload.signal.url }],
        }] : []),
      ],
    };

    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      log.error('Slack notification failed', text);
      throw new AlertError(`Slack webhook failed: ${res.status}`);
    }
  }
}
