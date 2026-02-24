// ---------------------------------------------------------------------------
// gas-reports.ts -- CRUD for gas_reports table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { getConfig } from '../config/index.js';
import { DatabaseError } from '../utils/errors.js';
import type { GasReport, GasReportInsert } from '../types/index.js';

const TABLE = 'audit_gas_reports';

function tenantId(): string {
  return getConfig().tenantId;
}

export async function createGasReport(data: GasReportInsert): Promise<GasReport> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .insert({ ...data, tenant_id: tenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create gas report: ${error.message}`);
  return row as GasReport;
}

export async function getGasReportByAuditId(auditId: string): Promise<GasReport | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .eq('audit_id', auditId)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get gas report: ${error.message}`);
  return (data as GasReport) ?? null;
}
