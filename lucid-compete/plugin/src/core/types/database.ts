// ---------------------------------------------------------------------------
// database.ts -- Entity types matching the SQL schema
// ---------------------------------------------------------------------------

import type {
  MonitorType,
  SignalType,
  Severity,
  BriefType,
  NotifierType,
  AlertStatus,
} from './common.js';

// ---- Competitor -------------------------------------------------------------

/** A tracked competitor (row shape). */
export interface Competitor {
  id: string;
  tenant_id: string;
  name: string;
  website: string;
  description?: string;
  industry?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

/** Payload for inserting a new competitor. */
export interface CompetitorInsert {
  tenant_id: string;
  name: string;
  website: string;
  description?: string;
  industry?: string;
  logo_url?: string;
}

// ---- Monitor ----------------------------------------------------------------

/** A monitor that watches a specific source for a competitor (row shape). */
export interface Monitor {
  id: string;
  tenant_id: string;
  competitor_id: string;
  monitor_type: MonitorType;
  url: string;
  config: Record<string, unknown>;
  enabled: boolean;
  last_fetched_at?: string;
  last_content_hash?: string;
  last_error?: string;
  created_at: string;
}

/** Payload for inserting a new monitor. */
export interface MonitorInsert {
  tenant_id: string;
  competitor_id: string;
  monitor_type: MonitorType;
  url: string;
  config: Record<string, unknown>;
  enabled: boolean;
  last_fetched_at?: string;
  last_content_hash?: string;
  last_error?: string;
}

// ---- Signal -----------------------------------------------------------------

/** A competitive signal detected by a monitor (row shape). */
export interface Signal {
  id: string;
  tenant_id: string;
  competitor_id: string;
  monitor_id: string;
  signal_type: SignalType;
  severity: Severity;
  title: string;
  summary?: string;
  content?: string;
  url?: string;
  metadata: Record<string, unknown>;
  detected_at: string;
  created_at: string;
}

/** Payload for inserting a new signal. */
export interface SignalInsert {
  tenant_id: string;
  competitor_id: string;
  monitor_id: string;
  signal_type: SignalType;
  severity: Severity;
  title: string;
  summary?: string;
  content?: string;
  url?: string;
  metadata: Record<string, unknown>;
  /** Defaults to now if omitted. */
  detected_at?: string;
}

// ---- Battlecard -------------------------------------------------------------

/** An AI-generated battlecard for a competitor (row shape). */
export interface Battlecard {
  id: string;
  tenant_id: string;
  competitor_id: string;
  markdown: string;
  html?: string;
  signal_count: number;
  generated_at: string;
  created_at: string;
}

/** Payload for inserting a new battlecard. */
export interface BattlecardInsert {
  tenant_id: string;
  competitor_id: string;
  markdown: string;
  html?: string;
  signal_count: number;
  generated_at: string;
}

// ---- Brief ------------------------------------------------------------------

/** A periodic intelligence brief (row shape). */
export interface Brief {
  id: string;
  tenant_id: string;
  brief_type: BriefType;
  /** ISO-8601 date string (YYYY-MM-DD). */
  date: string;
  title?: string;
  markdown: string;
  html?: string;
  signal_count: number;
  competitor_count: number;
  generated_at: string;
  created_at: string;
}

/** Payload for inserting a new brief. */
export interface BriefInsert {
  tenant_id: string;
  brief_type: BriefType;
  /** ISO-8601 date string (YYYY-MM-DD). */
  date: string;
  title?: string;
  markdown: string;
  html?: string;
  signal_count: number;
  competitor_count: number;
  generated_at: string;
}

// ---- AlertLog ---------------------------------------------------------------

/** A record of an alert notification attempt (row shape). */
export interface AlertLog {
  id: string;
  tenant_id: string;
  signal_id?: string;
  channel: NotifierType;
  status: AlertStatus;
  payload?: Record<string, unknown>;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

/** Payload for inserting a new alert log entry. */
export interface AlertLogInsert {
  tenant_id: string;
  signal_id?: string;
  channel: NotifierType;
  status: AlertStatus;
  payload?: Record<string, unknown>;
  error_message?: string;
  sent_at?: string;
}
