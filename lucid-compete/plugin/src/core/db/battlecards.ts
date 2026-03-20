// ---------------------------------------------------------------------------
// battlecards.ts -- CRUD for the battlecards table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { DatabaseError } from '../utils/errors.js';
import type { Battlecard, BattlecardInsert } from '../types/index.js';

/**
 * Insert a new battlecard and return the created row.
 */
export async function createBattlecard(data: BattlecardInsert): Promise<Battlecard> {
  const { data: row, error } = await getSupabase()
    .from('battlecards')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to create battlecard: ${error.message}`);
  }

  return row as Battlecard;
}

/**
 * Get the latest battlecard for a given competitor, or null if none exist.
 */
export async function getLatestBattlecard(
  tenantId: string,
  competitorId: number,
): Promise<Battlecard | null> {
  const { data: row, error } = await getSupabase()
    .from('battlecards')
    .select()
    .eq('tenant_id', tenantId)
    .eq('competitor_id', competitorId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new DatabaseError(`Failed to get latest battlecard: ${error.message}`);
  }

  return row as Battlecard;
}

/**
 * List battlecards for a tenant, optionally filtered by competitor.
 */
export async function listBattlecards(
  tenantId: string,
  opts?: { competitorId?: number },
): Promise<Battlecard[]> {
  let query = getSupabase()
    .from('battlecards')
    .select()
    .eq('tenant_id', tenantId);

  if (opts?.competitorId !== undefined) {
    query = query.eq('competitor_id', opts.competitorId);
  }

  const { data: rows, error } = await query.order('generated_at', { ascending: false });

  if (error) {
    throw new DatabaseError(`Failed to list battlecards: ${error.message}`);
  }

  return (rows ?? []) as Battlecard[];
}
