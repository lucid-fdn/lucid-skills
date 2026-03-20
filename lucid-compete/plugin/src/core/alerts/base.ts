import type { Notifier, AlertPayload, NotifierType } from '../types/index.js';

export abstract class BaseNotifier implements Notifier {
  abstract readonly type: NotifierType;
  abstract readonly name: string;
  abstract isConfigured(): boolean;
  abstract notify(payload: AlertPayload): Promise<void>;
}
