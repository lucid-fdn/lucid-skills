import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnrichmentLog } from '../types/index.js';
import { DatabaseError } from '../utils/errors.js';
import { isoNow } from '../utils/date.js';

const TABLE = 'prospect_enrichment_log';

export async function logEnrichment(
  db: SupabaseClient,
  tenantId: string,
  entityType: 'lead' | 'company',
  entityId: string,
  provider: string,
  data: Record<string, unknown>,
): Promise<EnrichmentLog> {
  const record = {
    tenant_id: tenantId,
    entity_type: entityType,
    entity_id: entityId,
    provider,
    data,
    created_at: isoNow(),
  };

  const { data: result, error } = await db.from(TABLE).insert(record).select().single();
  if (error) throw new DatabaseError(error.message, 'insert', TABLE);
  return result as EnrichmentLog;
}

export async function getEnrichmentsByEntity(
  db: SupabaseClient,
  entityType: 'lead' | 'company',
  entityId: string,
): Promise<EnrichmentLog[]> {
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) throw new DatabaseError(error.message, 'select', TABLE);
  return (data as EnrichmentLog[]) ?? [];
}

export async function getLatestEnrichment(
  db: SupabaseClient,
  entityType: 'lead' | 'company',
  entityId: string,
): Promise<EnrichmentLog | null> {
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new DatabaseError(error.message, 'select', TABLE);
  return (data as EnrichmentLog) ?? null;
}

export async function countEnrichments(db: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await db
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  if (error) throw new DatabaseError(error.message, 'count', TABLE);
  return count ?? 0;
}
