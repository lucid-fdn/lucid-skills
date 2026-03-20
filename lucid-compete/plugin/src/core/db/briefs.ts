// ---------------------------------------------------------------------------
// briefs.ts -- CRUD for the briefs table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { DatabaseError } from '../utils/errors.js';
import type { Brief, BriefInsert, BriefType } from '../types/index.js';

/**
 * Insert a new brief and return the created row.
 */
export async function createBrief(data: BriefInsert): Promise<Brief> {
  const { data: row, error } = await getSupabase()
    .from('briefs')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to create brief: ${error.message}`);
  }

  return row as Brief;
}

/**
 * Get the latest brief, optionally filtered by brief_type. Returns null if none exist.
 */
export async function getLatestBrief(
  tenantId: string,
  briefType?: BriefType,
): Promise<Brief | null> {
  let query = getSupabase()
    .from('briefs')
    .select()
    .eq('tenant_id', tenantId);

  if (briefType !== undefined) {
    query = query.eq('brief_type', briefType);
  }

  const { data: row, error } = await query
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new DatabaseError(`Failed to get latest brief: ${error.message}`);
  }

  return row as Brief;
}

/**
 * List briefs for a tenant, optionally filtered by brief type.
 */
export async function listBriefs(
  tenantId: string,
  opts?: { briefType?: BriefType },
): Promise<Brief[]> {
  let query = getSupabase()
    .from('briefs')
    .select()
    .eq('tenant_id', tenantId);

  if (opts?.briefType !== undefined) {
    query = query.eq('brief_type', opts.briefType);
  }

  const { data: rows, error } = await query.order('generated_at', { ascending: false });

  if (error) {
    throw new DatabaseError(`Failed to list briefs: ${error.message}`);
  }

  return (rows ?? []) as Brief[];
}
