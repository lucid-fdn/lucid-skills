import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaxSummary, TaxSummaryInsert } from '../types/database.js';
import { DatabaseError } from '../utils/errors.js';

const TABLE = 'tax_summaries';

export async function upsertSummary(
  db: SupabaseClient,
  summary: TaxSummaryInsert,
): Promise<TaxSummary> {
  const { data, error } = await db
    .from(TABLE)
    .upsert(summary, { onConflict: 'tenant_id,tax_year,jurisdiction' })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to upsert summary: ${error.message}`);
  return data as TaxSummary;
}

export async function getSummary(
  db: SupabaseClient,
  tenantId: string,
  taxYear: number,
  jurisdiction: string,
): Promise<TaxSummary | null> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('tax_year', taxYear)
    .eq('jurisdiction', jurisdiction)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get summary: ${error.message}`);
  return (data as TaxSummary) ?? null;
}

export async function getAllSummaries(
  db: SupabaseClient,
  tenantId: string,
): Promise<TaxSummary[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('tax_year', { ascending: false });
  if (error) throw new DatabaseError(`Failed to list summaries: ${error.message}`);
  return (data as TaxSummary[]) ?? [];
}
