// ---------------------------------------------------------------------------
// alert-log.ts -- CRUD for the alert_log table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { DatabaseError } from '../utils/errors.js';
import type { AlertLog, AlertLogInsert, AlertStatus } from '../types/index.js';

/**
 * Insert a new alert log entry and return the created row.
 */
export async function createAlertLog(data: AlertLogInsert): Promise<AlertLog> {
  const { data: row, error } = await getSupabase()
    .from('alert_log')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to create alert log: ${error.message}`);
  }

  return row as AlertLog;
}

/**
 * Update an alert log entry (status, error_message, sent_at) and return the updated row.
 */
export async function updateAlertLog(
  id: number,
  data: { status: AlertStatus; error_message?: string | null; sent_at?: string | null },
): Promise<AlertLog> {
  const { data: row, error } = await getSupabase()
    .from('alert_log')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to update alert log: ${error.message}`);
  }

  return row as AlertLog;
}

/**
 * List alert logs for a tenant, optionally filtered by signal_id or status.
 */
export async function listAlertLogs(
  tenantId: string,
  opts?: { signalId?: number; status?: AlertStatus },
): Promise<AlertLog[]> {
  let query = getSupabase()
    .from('alert_log')
    .select()
    .eq('tenant_id', tenantId);

  if (opts?.signalId !== undefined) {
    query = query.eq('signal_id', opts.signalId);
  }

  if (opts?.status !== undefined) {
    query = query.eq('status', opts.status);
  }

  const { data: rows, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new DatabaseError(`Failed to list alert logs: ${error.message}`);
  }

  return (rows ?? []) as AlertLog[];
}
