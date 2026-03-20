// ---------------------------------------------------------------------------
// Lucid Invoice — Revenue Metrics DB Operations
// ---------------------------------------------------------------------------

import { getDbClient, getTenantId } from './client.js';
import { DatabaseError } from '../core/errors.js';
import type { RevenueMetricRow, RevenueMetricInsert } from '../types/database.js';

const TABLE = 'invoice_revenue_metrics';

export async function upsertRevenueMetric(
  data: Omit<RevenueMetricInsert, 'tenant_id'>,
): Promise<RevenueMetricRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .upsert(
      { ...data, tenant_id: getTenantId() },
      { onConflict: 'tenant_id,period' },
    )
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to upsert revenue metric: ${error.message}`);
  return row as RevenueMetricRow;
}

export async function getRevenueMetrics(
  startPeriod?: string,
  endPeriod?: string,
): Promise<RevenueMetricRow[]> {
  const db = getDbClient();
  let query = db.from(TABLE).select('*').eq('tenant_id', getTenantId());
  if (startPeriod) query = query.gte('period', startPeriod);
  if (endPeriod) query = query.lte('period', endPeriod);
  query = query.order('period', { ascending: true });

  const { data: rows, error } = await query;
  if (error) throw new DatabaseError(`Failed to get revenue metrics: ${error.message}`);
  return (rows ?? []) as RevenueMetricRow[];
}

export async function getLatestRevenueMetric(): Promise<RevenueMetricRow | null> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', getTenantId())
    .order('period', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new DatabaseError(`Failed to get latest metric: ${error.message}`);
  return (row as RevenueMetricRow) ?? null;
}
