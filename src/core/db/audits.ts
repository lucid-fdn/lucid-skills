// ---------------------------------------------------------------------------
// audits.ts -- CRUD for audits table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { getConfig } from '../config/index.js';
import { DatabaseError } from '../utils/errors.js';
import type { Audit, AuditInsert, AuditUpdate } from '../types/index.js';
import type { AuditStatus } from '../types/index.js';

const TABLE = 'audit_audits';

function tenantId(): string {
  return getConfig().tenantId;
}

export async function createAudit(data: AuditInsert): Promise<Audit> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .insert({ ...data, tenant_id: tenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create audit: ${error.message}`);
  return row as Audit;
}

export async function getAuditById(id: string): Promise<Audit | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get audit: ${error.message}`);
  return (data as Audit) ?? null;
}

export interface ListAuditsOptions {
  contract_id?: string;
  status?: AuditStatus;
  limit?: number;
  offset?: number;
}

export async function listAudits(opts: ListAuditsOptions = {}): Promise<Audit[]> {
  let query = getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .order('created_at', { ascending: false });

  if (opts.contract_id) query = query.eq('contract_id', opts.contract_id);
  if (opts.status) query = query.eq('status', opts.status);
  query = query.range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw new DatabaseError(`Failed to list audits: ${error.message}`);
  return (data as Audit[]) ?? [];
}

export async function updateAudit(id: string, updates: AuditUpdate): Promise<Audit> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId())
    .eq('id', id)
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to update audit: ${error.message}`);
  return data as Audit;
}
