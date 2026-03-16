import { BaseNotifier } from './base.js';
import type { AlertPayload, NotifierType } from '../types/index.js';
import { log } from '../utils/logger.js';

export class EmailNotifier extends BaseNotifier {
  readonly type: NotifierType = 'email';
  readonly name = 'Email (SMTP)';
  private alertEmail?: string;
  private smtpHost?: string;
  private smtpPort?: number;
  private smtpUser?: string;
  private smtpPass?: string;

  constructor(opts?: { alertEmail?: string; smtpHost?: string; smtpPort?: number; smtpUser?: string; smtpPass?: string }) {
    super();
    this.alertEmail = opts?.alertEmail;
    this.smtpHost = opts?.smtpHost;
    this.smtpPort = opts?.smtpPort;
    this.smtpUser = opts?.smtpUser;
    this.smtpPass = opts?.smtpPass;
  }

  isConfigured(): boolean {
    return !!(this.alertEmail && this.smtpHost);
  }

  async notify(payload: AlertPayload): Promise<void> {
    // MVP: Log the email that would be sent. Full SMTP implementation requires nodemailer or similar.
    log.info(`[email] Would send to ${this.alertEmail}: ${payload.signal.severity.toUpperCase()} - ${payload.signal.title}`);
    log.info(`[email] Competitor: ${payload.competitor.name}`);
    log.info(`[email] SMTP: ${this.smtpHost}:${this.smtpPort} (user: ${this.smtpUser}, pass: ${this.smtpPass ? '***' : 'none'})`);
    // In a production implementation, use nodemailer or a transactional email API here
  }
}
