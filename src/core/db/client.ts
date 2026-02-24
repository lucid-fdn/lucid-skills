import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PluginConfig } from '../types/config.js';
import { logger } from '../utils/logger.js';

let _client: SupabaseClient | null = null;

/**
 * Get or create the Supabase client singleton.
 */
export function getSupabaseClient(config: PluginConfig): SupabaseClient {
  if (!_client) {
    logger.debug('Creating Supabase client');
    _client = createClient(config.supabaseUrl, config.supabaseKey);
  }
  return _client;
}

/**
 * Reset the client (useful for testing).
 */
export function resetClient(): void {
  _client = null;
}
