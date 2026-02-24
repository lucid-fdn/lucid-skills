// ---------------------------------------------------------------------------
// alerts.ts -- Alert / notification types
// ---------------------------------------------------------------------------

import type { Signal, Competitor } from './database.js';
import type { NotifierType } from './common.js';

/** Payload delivered to a Notifier when an alert fires. */
export interface AlertPayload {
  /** The signal that triggered the alert. */
  signal: Signal;
  /** The competitor associated with the signal. */
  competitor: Competitor;
  /** A pre-formatted, human-readable message ready for delivery. */
  formattedMessage: string;
}

/** Contract that every alert-delivery channel must implement. */
export interface Notifier {
  /** The channel type this notifier handles. */
  readonly type: NotifierType;
  /** Human-readable name for logging / UI. */
  readonly name: string;
  /** Returns true when all required credentials / config are available. */
  isConfigured(): boolean;
  /** Send the alert payload through this channel. */
  notify(payload: AlertPayload): Promise<void>;
}
