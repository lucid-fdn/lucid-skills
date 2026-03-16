import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lead, LeadStatus, LeadSource } from '../types/index.js';
import { DatabaseError } from '../utils/errors.js';
import { isoNow } from '../utils/date.js';

const TABLE = 'prospect_leads';

export interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  minScore?: number;
  campaign_id?: string;
  limit?: number;
  offset?: number;
}

export async function upsertLead(
  db: SupabaseClient,
  tenantId: string,
  lead: Partial<Lead> & { email?: string | null },
): Promise<Lead> {
  const now = isoNow();
  const record = {
    ...lead,
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
  return data as Lead;
}

export async function getLeadById(db: SupabaseClient, id: string): Promise<Lead | null> {
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(error.message, 'select', TABLE);
  return (data as Lead) ?? null;
}

export async function getLeadByEmail(db: SupabaseClient, tenantId: string, email: string): Promise<Lead | null> {
  const { data, error } = await db.from(TABLE).select().eq('tenant_id', tenantId).eq('email', email).single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(error.message, 'select', TABLE);
  return (data as Lead) ?? null;
}

export async function listLeads(db: SupabaseClient, tenantId: string, filters: LeadFilters = {}): Promise<Lead[]> {
  let query = db.from(TABLE).select().eq('tenant_id', tenantId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.source) query = query.eq('lead_source', filters.source);
  if (filters.minScore !== undefined) query = query.gte('score', filters.minScore);
  if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id);

  query = query.order('score', { ascending: false });
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message, 'list', TABLE);
  return (data as Lead[]) ?? [];
}

export async function updateLead(db: SupabaseClient, id: string, updates: Partial<Lead>): Promise<Lead> {
  const { data, error } = await db
    .from(TABLE)
    .update({ ...updates, updated_at: isoNow() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new DatabaseError(error.message, 'update', TABLE);
  return data as Lead;
}

export async function deleteLead(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) throw new DatabaseError(error.message, 'delete', TABLE);
}

export async function searchLeads(db: SupabaseClient, tenantId: string, query: string): Promise<Lead[]> {
  const searchTerm = `%${query}%`;
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId)
    .or(`email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},company_name.ilike.${searchTerm},title.ilike.${searchTerm}`)
    .order('score', { ascending: false })
    .limit(50);

  if (error) throw new DatabaseError(error.message, 'search', TABLE);
  return (data as Lead[]) ?? [];
}

export async function countLeads(db: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await db.from(TABLE).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
  if (error) throw new DatabaseError(error.message, 'count', TABLE);
  return count ?? 0;
}
