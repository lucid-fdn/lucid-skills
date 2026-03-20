// ---------------------------------------------------------------------------
// fixtures.ts -- Test fixtures for competitors, monitors, signals
// ---------------------------------------------------------------------------

import type { Competitor, Monitor, Signal, SignalInsert } from '../../src/core/types/index.js';

export const mockCompetitor: Competitor = {
  id: '1',
  tenant_id: 'default',
  name: 'Acme Corp',
  website: 'https://acme.example.com',
  description: 'A competitor in our space',
  industry: 'SaaS',
  logo_url: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockMonitor: Monitor = {
  id: '1',
  tenant_id: 'default',
  competitor_id: '1',
  monitor_type: 'web-diff',
  url: 'https://acme.example.com/pricing',
  config: {},
  enabled: true,
  last_fetched_at: undefined,
  last_content_hash: undefined,
  last_error: undefined,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockSignal: Signal = {
  id: '1',
  tenant_id: 'default',
  competitor_id: '1',
  monitor_id: '1',
  signal_type: 'pricing_change',
  severity: 'critical',
  title: 'Acme Corp pricing page changed',
  summary: 'Content change detected on pricing page',
  content: 'New pricing: $99/mo',
  url: 'https://acme.example.com/pricing',
  metadata: {},
  detected_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-15T12:00:00Z',
};

export const mockSignalInsert: SignalInsert = {
  tenant_id: 'default',
  competitor_id: '1',
  monitor_id: '1',
  signal_type: 'pricing_change',
  severity: 'critical',
  title: 'Acme Corp pricing page changed',
  summary: 'Content change detected',
  url: 'https://acme.example.com/pricing',
  metadata: {},
};
