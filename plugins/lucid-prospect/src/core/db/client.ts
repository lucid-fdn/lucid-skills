import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

let _client: SupabaseClient | null = null;

export function getClient(url?: string, key?: string): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = url ?? process.env.PROSPECT_SUPABASE_URL;
  const supabaseKey = key ?? process.env.PROSPECT_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and key are required');
  }

  logger.info('Initializing Supabase client');
  _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

export function resetClient(): void {
  _client = null;
}
