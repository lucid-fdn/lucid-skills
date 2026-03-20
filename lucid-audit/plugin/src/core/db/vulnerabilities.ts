// ---------------------------------------------------------------------------
// vulnerabilities.ts -- CRUD for vulnerabilities table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { getConfig } from '../config/index.js';
import { DatabaseError } from '../utils/errors.js';
import type { Vulnerability, VulnerabilityInsert } from '../types/index.js';

const TABLE = 'audit_vulnerabilities';

function tenantId(): string {
  return getConfig().tenantId;
}

export async function createVulnerability(data: VulnerabilityInsert): Promise<Vulnerability> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .insert({ ...data, tenant_id: tenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create vulnerability: ${error.message}`);
  return row as Vulnerability;
}

export async function getVulnerabilityById(id: string): Promise<Vulnerability | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get vulnerability: ${error.message}`);
  return (data as Vulnerability) ?? null;
}

export interface ListVulnerabilitiesOptions {
  audit_id?: string;
  severity?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export async function listVulnerabilities(
  opts: ListVulnerabilitiesOptions = {},
): Promise<Vulnerability[]> {
  let query = getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .order('created_at', { ascending: false });

  if (opts.audit_id) query = query.eq('audit_id', opts.audit_id);
  if (opts.severity) query = query.eq('severity', opts.severity);
  if (opts.category) query = query.eq('category', opts.category);
  query = query.range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw new DatabaseError(`Failed to list vulnerabilities: ${error.message}`);
  return (data as Vulnerability[]) ?? [];
}
