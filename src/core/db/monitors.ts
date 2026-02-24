// ---------------------------------------------------------------------------
// monitors.ts -- CRUD operations for the monitors table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { DatabaseError } from '../utils/errors.js';
import type { Monitor, MonitorInsert } from '../types/index.js';

/**
 * Insert a new monitor and return the created row.
 */
export async function createMonitor(data: MonitorInsert): Promise<Monitor> {
  const { data: row, error } = await getSupabase()
    .from('monitors')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to create monitor: ${error.message}`);
  }

  return row as Monitor;
}

/**
 * Retrieve a monitor by ID, or null if not found.
 */
export async function getMonitor(id: number): Promise<Monitor | null> {
  const { data: row, error } = await getSupabase()
    .from('monitors')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new DatabaseError(`Failed to get monitor: ${error.message}`);
  }

  return row as Monitor;
}

/**
 * List monitors for a tenant with optional filters.
 */
export async function listMonitors(
  tenantId: string,
  opts?: { competitorId?: number; enabled?: boolean },
): Promise<Monitor[]> {
  let query = getSupabase()
    .from('monitors')
    .select()
    .eq('tenant_id', tenantId);

  if (opts?.competitorId !== undefined) {
    query = query.eq('competitor_id', opts.competitorId);
  }

  if (opts?.enabled !== undefined) {
    query = query.eq('enabled', opts.enabled);
  }

  const { data: rows, error } = await query.order('created_at', { ascending: true });

  if (error) {
    throw new DatabaseError(`Failed to list monitors: ${error.message}`);
  }

  return (rows ?? []) as Monitor[];
}

/**
 * Update a monitor by ID and return the updated row.
 */
export async function updateMonitor(
  id: number,
  data: Partial<MonitorInsert>,
): Promise<Monitor> {
  const { data: row, error } = await getSupabase()
    .from('monitors')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to update monitor: ${error.message}`);
  }

  return row as Monitor;
}

/**
 * Delete a monitor by ID.
 */
export async function deleteMonitor(id: number): Promise<void> {
  const { error } = await getSupabase()
    .from('monitors')
    .delete()
    .eq('id', id);

  if (error) {
    throw new DatabaseError(`Failed to delete monitor: ${error.message}`);
  }
}

/**
 * Update only the fetch-status fields of a monitor (last_fetched_at, last_content_hash, last_error).
 */
export async function updateMonitorFetchStatus(
  id: number,
  lastFetchedAt: string,
  lastContentHash?: string | null,
  lastError?: string | null,
): Promise<void> {
  const payload: Record<string, unknown> = {
    last_fetched_at: lastFetchedAt,
  };

  if (lastContentHash !== undefined) {
    payload.last_content_hash = lastContentHash;
  }

  if (lastError !== undefined) {
    payload.last_error = lastError;
  }

  const { error } = await getSupabase()
    .from('monitors')
    .update(payload)
    .eq('id', id);

  if (error) {
    throw new DatabaseError(`Failed to update monitor fetch status: ${error.message}`);
  }
}
