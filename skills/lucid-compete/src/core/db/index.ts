// ---------------------------------------------------------------------------
// index.ts -- Barrel re-export for all database modules
// ---------------------------------------------------------------------------

// Client
export { initSupabase, getSupabase, resetSupabase } from './client.js';
export type { SupabaseClient } from './client.js';

// Competitors
export {
  createCompetitor,
  getCompetitor,
  listCompetitors,
  updateCompetitor,
  deleteCompetitor,
} from './competitors.js';

// Monitors
export {
  createMonitor,
  getMonitor,
  listMonitors,
  updateMonitor,
  deleteMonitor,
  updateMonitorFetchStatus,
} from './monitors.js';

// Signals
export {
  createSignal,
  createSignals,
  listSignals,
  searchSignals,
  getSignalCountByCompetitor,
} from './signals.js';

// Battlecards
export {
  createBattlecard,
  getLatestBattlecard,
  listBattlecards,
} from './battlecards.js';

// Briefs
export {
  createBrief,
  getLatestBrief,
  listBriefs,
} from './briefs.js';

// Alert Log
export {
  createAlertLog,
  updateAlertLog,
  listAlertLogs,
} from './alert-log.js';
