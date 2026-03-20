import type { SupabaseClient } from '@supabase/supabase-js';
import type { Company, Industry } from '../types/index.js';
import { DatabaseError } from '../utils/errors.js';
import { isoNow } from '../utils/date.js';

const TABLE = 'prospect_companies';

export interface CompanyFilters {
  industry?: Industry;
  minEmployees?: number;
  maxEmployees?: number;
  limit?: number;
  offset?: number;
}

export async function upsertCompany(
  db: SupabaseClient,
  tenantId: string,
  company: Partial<Company>,
): Promise<Company> {
  const now = isoNow();
  const record = {
    ...company,
    tenant_id: tenantId,
    updated_at: now,
  };

  if (!record.created_at) {
    record.created_at = now;
  }

  const { data, error } = await db
    .from(TABLE)
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new DatabaseError(error.message, 'upsert', TABLE);
  return data as Company;
}

export async function getCompanyById(db: SupabaseClient, id: string): Promise<Company | null> {
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(error.message, 'select', TABLE);
  return (data as Company) ?? null;
}

export async function getCompanyByDomain(
  db: SupabaseClient,
  tenantId: string,
  domain: string,
): Promise<Company | null> {
  const { data, error } = await db.from(TABLE).select().eq('tenant_id', tenantId).eq('domain', domain).single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(error.message, 'select', TABLE);
  return (data as Company) ?? null;
}

export async function listCompanies(
  db: SupabaseClient,
  tenantId: string,
  filters: CompanyFilters = {},
): Promise<Company[]> {
  let query = db.from(TABLE).select().eq('tenant_id', tenantId);

  if (filters.industry) query = query.eq('industry', filters.industry);
  if (filters.minEmployees !== undefined) query = query.gte('employee_count', filters.minEmployees);
  if (filters.maxEmployees !== undefined) query = query.lte('employee_count', filters.maxEmployees);

  query = query.order('name', { ascending: true });
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message, 'list', TABLE);
  return (data as Company[]) ?? [];
}

export async function updateCompany(db: SupabaseClient, id: string, updates: Partial<Company>): Promise<Company> {
  const { data, error } = await db
    .from(TABLE)
    .update({ ...updates, updated_at: isoNow() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new DatabaseError(error.message, 'update', TABLE);
  return data as Company;
}

export async function searchCompanies(db: SupabaseClient, tenantId: string, query: string): Promise<Company[]> {
  const searchTerm = `%${query}%`;
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId)
    .or(`name.ilike.${searchTerm},domain.ilike.${searchTerm},description.ilike.${searchTerm},industry.ilike.${searchTerm}`)
    .order('name', { ascending: true })
    .limit(50);

  if (error) throw new DatabaseError(error.message, 'search', TABLE);
  return (data as Company[]) ?? [];
}

export async function countCompanies(db: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await db
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  if (error) throw new DatabaseError(error.message, 'count', TABLE);
  return count ?? 0;
}
