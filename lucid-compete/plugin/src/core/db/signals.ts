// ---------------------------------------------------------------------------
// signals.ts -- CRUD + search for the signals table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { DatabaseError } from '../utils/errors.js';
import type { Signal, SignalInsert, Severity, SignalType } from '../types/index.js';

/**
 * Insert a single signal and return the created row.
 */
export async function createSignal(data: SignalInsert): Promise<Signal> {
  const { data: row, error } = await getSupabase()
    .from('signals')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to create signal: ${error.message}`);
  }

  return row as Signal;
}

/**
 * Batch-insert multiple signals and return the created rows.
 */
export async function createSignals(data: SignalInsert[]): Promise<Signal[]> {
  if (data.length === 0) return [];

  const { data: rows, error } = await getSupabase()
    .from('signals')
    .insert(data)
    .select();

  if (error) {
    throw new DatabaseError(`Failed to create signals: ${error.message}`);
  }

  return (rows ?? []) as Signal[];
}

/**
 * List signals for a tenant with optional filters, ordered by detected_at descending.
 */
export async function listSignals(
  tenantId: string,
  opts?: {
    competitorId?: number;
    severity?: Severity;
    signalType?: SignalType;
    limit?: number;
    daysBack?: number;
  },
): Promise<Signal[]> {
  let query = getSupabase()
    .from('signals')
    .select()
    .eq('tenant_id', tenantId);

  if (opts?.competitorId !== undefined) {
    query = query.eq('competitor_id', opts.competitorId);
  }

  if (opts?.severity !== undefined) {
    query = query.eq('severity', opts.severity);
  }

  if (opts?.signalType !== undefined) {
    query = query.eq('signal_type', opts.signalType);
  }

  if (opts?.daysBack !== undefined) {
    const since = new Date();
    since.setDate(since.getDate() - opts.daysBack);
    query = query.gte('detected_at', since.toISOString());
  }

  query = query.order('detected_at', { ascending: false });

  if (opts?.limit !== undefined) {
    query = query.limit(opts.limit);
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new DatabaseError(`Failed to list signals: ${error.message}`);
  }

  return (rows ?? []) as Signal[];
}

/**
 * Full-text search across signal title, summary, and content.
 */
export async function searchSignals(
  tenantId: string,
  searchQuery: string,
  limit = 20,
): Promise<Signal[]> {
  const { data: rows, error } = await getSupabase()
    .from('signals')
    .select()
    .eq('tenant_id', tenantId)
    .textSearch('fts', searchQuery, { type: 'websearch' })
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new DatabaseError(`Failed to search signals: ${error.message}`);
  }

  return (rows ?? []) as Signal[];
}

/**
 * Get signal counts grouped by competitor_id for a tenant.
 */
export async function getSignalCountByCompetitor(
  tenantId: string,
): Promise<Array<{ competitor_id: number; count: number }>> {
  const { data: rows, error } = await getSupabase()
    .from('signals')
    .select('competitor_id')
    .eq('tenant_id', tenantId);

  if (error) {
    throw new DatabaseError(`Failed to get signal counts: ${error.message}`);
  }

  // Group and count in JS
  const counts = new Map<number, number>();

  for (const row of rows ?? []) {
    const cid = (row as { competitor_id: number }).competitor_id;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([competitor_id, count]) => ({
    competitor_id,
    count,
  }));
}
