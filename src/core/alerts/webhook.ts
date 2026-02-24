import { createHmac } from 'node:crypto';
import { BaseNotifier } from './base.js';
import type { AlertPayload, NotifierType } from '../types/index.js';
import { log } from '../utils/logger.js';
import { AlertError } from '../utils/errors.js';

export class WebhookNotifier extends BaseNotifier {
  readonly type: NotifierType = 'webhook';
  readonly name = 'Generic Webhook';
  private webhookUrl?: string;
  private secret?: string;

  constructor(webhookUrl?: string, secret?: string) {
    super();
    this.webhookUrl = webhookUrl;
    this.secret = secret;
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  async notify(payload: AlertPayload): Promise<void> {
    if (!this.webhookUrl) return;

    const body = JSON.stringify({
      event: 'competitive_signal',
      signal: {
        type: payload.signal.signal_type,
        severity: payload.signal.severity,
        title: payload.signal.title,
        summary: payload.signal.summary,
        url: payload.signal.url,
        competitor: payload.competitor.name,
        detected_at: payload.signal.detected_at,
      },
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.secret) {
      headers['X-Compete-Signature'] = createHmac('sha256', this.secret).update(body).digest('hex');
    }

    const res = await fetch(this.webhookUrl, { method: 'POST', headers, body });
    if (!res.ok) {
      log.error('Webhook notification failed', res.status.toString());
      throw new AlertError(`Webhook failed: ${res.status}`);
    }
  }
}
