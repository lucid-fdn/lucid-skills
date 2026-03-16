import type { SupabaseClient } from '@supabase/supabase-js';
import type { CostBasisLot, CostBasisLotInsert } from '../types/database.js';
import { DatabaseError } from '../utils/errors.js';

const TABLE = 'tax_cost_basis_lots';

export async function insertCostBasisLot(
  db: SupabaseClient,
  lot: CostBasisLotInsert,
): Promise<CostBasisLot> {
  const { data, error } = await db.from(TABLE).insert(lot).select().single();
  if (error) throw new DatabaseError(`Failed to insert cost basis lot: ${error.message}`);
  return data as CostBasisLot;
}

export async function insertCostBasisLots(
  db: SupabaseClient,
  lots: CostBasisLotInsert[],
): Promise<CostBasisLot[]> {
  if (lots.length === 0) return [];
  const { data, error } = await db.from(TABLE).insert(lots).select();
  if (error) throw new DatabaseError(`Failed to insert cost basis lots: ${error.message}`);
  return (data as CostBasisLot[]) ?? [];
}

export async function getAvailableLots(
  db: SupabaseClient,
  tenantId: string,
  tokenSymbol: string,
): Promise<CostBasisLot[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('token_symbol', tokenSymbol)
    .eq('is_consumed', false)
    .gt('remaining_amount', 0)
    .order('acquired_at', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get available lots: ${error.message}`);
  return (data as CostBasisLot[]) ?? [];
}

export async function getAllLotsByTenant(
  db: SupabaseClient,
  tenantId: string,
): Promise<CostBasisLot[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('acquired_at', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get lots: ${error.message}`);
  return (data as CostBasisLot[]) ?? [];
}

export async function updateLotRemaining(
  db: SupabaseClient,
  lotId: string,
  remaining: number,
): Promise<void> {
  const isConsumed = remaining <= 0;
  const { error } = await db
    .from(TABLE)
    .update({ remaining_amount: remaining, is_consumed: isConsumed })
    .eq('id', lotId);
  if (error) throw new DatabaseError(`Failed to update lot: ${error.message}`);
}
