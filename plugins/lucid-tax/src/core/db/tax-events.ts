import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaxEvent, TaxEventInsert } from '../types/database.js';
import { DatabaseError } from '../utils/errors.js';

const TABLE = 'tax_events';

export async function insertTaxEvents(
  db: SupabaseClient,
  events: TaxEventInsert[],
): Promise<TaxEvent[]> {
  if (events.length === 0) return [];
  const { data, error } = await db.from(TABLE).insert(events).select();
  if (error) throw new DatabaseError(`Failed to insert tax events: ${error.message}`);
  return (data as TaxEvent[]) ?? [];
}

export async function getTaxEventsByYear(
  db: SupabaseClient,
  tenantId: string,
  taxYear: number,
): Promise<TaxEvent[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('tax_year', taxYear)
    .order('created_at', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get tax events: ${error.message}`);
  return (data as TaxEvent[]) ?? [];
}

export async function getTaxEventsByTenant(
  db: SupabaseClient,
  tenantId: string,
): Promise<TaxEvent[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get tax events: ${error.message}`);
  return (data as TaxEvent[]) ?? [];
}

export async function deleteTaxEventsByYear(
  db: SupabaseClient,
  tenantId: string,
  taxYear: number,
): Promise<void> {
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('tenant_id', tenantId)
    .eq('tax_year', taxYear);
  if (error) throw new DatabaseError(`Failed to delete tax events: ${error.message}`);
}
