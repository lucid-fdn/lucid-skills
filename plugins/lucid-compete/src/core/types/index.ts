// ---------------------------------------------------------------------------
// index.ts -- Barrel re-export for all type definitions
// ---------------------------------------------------------------------------

export type {
  MonitorType,
  SignalType,
  Severity,
  BriefType,
  NotifierType,
  AlertStatus,
} from './common.js';

export {
  MONITOR_TYPES,
  SIGNAL_TYPES,
  SEVERITIES,
  BRIEF_TYPES,
  NOTIFIER_TYPES,
  ALERT_STATUSES,
} from './common.js';

export type { PluginConfig } from './config.js';

export type {
  Competitor,
  CompetitorInsert,
  Monitor,
  MonitorInsert,
  Signal,
  SignalInsert,
  Battlecard,
  BattlecardInsert,
  Brief,
  BriefInsert,
  AlertLog,
  AlertLogInsert,
} from './database.js';

export type { FetchResult, Fetcher } from './fetcher.js';

export type { BattlecardPromptData, BriefPromptData } from './analysis.js';

export type { AlertPayload, Notifier } from './alerts.js';
