// ---------------------------------------------------------------------------
// Lucid Invoice — Supabase Database Client
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DbConfig } from '../types/config.js';
import { logger } from '../core/logger.js';

let _client: SupabaseClient | null = null;
let _tenantId: string = 'default';

/**
 * Initialise (or re-initialise) the shared Supabase client.
 */
export function initDbClient(config: DbConfig): SupabaseClient {
  _client = createClient(config.supabaseUrl, config.supabaseKey);
  _tenantId = config.tenantId;
  logger.info('Database client initialised');
  return _client;
}

/**
 * Get the current Supabase client — throws if not yet initialised.
 */
export function getDbClient(): SupabaseClient {
  if (!_client) {
    throw new Error('Database client not initialised — call initDbClient() first');
  }
  return _client;
}

/** Return the active tenant identifier. */
export function getTenantId(): string {
  return _tenantId;
}
