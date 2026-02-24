import type { SupabaseClient } from '@supabase/supabase-js';
import type { Transaction, TransactionInsert } from '../types/database.js';
import { DatabaseError } from '../utils/errors.js';

const TABLE = 'tax_transactions';

export async function insertTransactions(
  db: SupabaseClient,
  txns: TransactionInsert[],
): Promise<Transaction[]> {
  if (txns.length === 0) return [];
  const { data, error } = await db.from(TABLE).insert(txns).select();
  if (error) throw new DatabaseError(`Failed to insert transactions: ${error.message}`);
  return (data as Transaction[]) ?? [];
}

export async function getTransactionsByWallet(
  db: SupabaseClient,
  walletId: string,
): Promise<Transaction[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('wallet_id', walletId)
    .order('timestamp', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get transactions: ${error.message}`);
  return (data as Transaction[]) ?? [];
}

export async function getTransactionsByTenant(
  db: SupabaseClient,
  tenantId: string,
  taxYear?: number,
): Promise<Transaction[]> {
  let query = db.from(TABLE).select('*').eq('tenant_id', tenantId);
  if (taxYear) {
    query = query.gte('timestamp', `${taxYear}-01-01`).lte('timestamp', `${taxYear}-12-31T23:59:59`);
  }
  const { data, error } = await query.order('timestamp', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get transactions: ${error.message}`);
  return (data as Transaction[]) ?? [];
}

export async function getUnclassifiedTransactions(
  db: SupabaseClient,
  tenantId: string,
): Promise<Transaction[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_classified', false)
    .order('timestamp', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get unclassified transactions: ${error.message}`);
  return (data as Transaction[]) ?? [];
}

export async function updateTransactionType(
  db: SupabaseClient,
  txId: string,
  txType: string,
  notes: string | null = null,
): Promise<void> {
  const { error } = await db
    .from(TABLE)
    .update({ tx_type: txType, is_classified: true, classification_notes: notes })
    .eq('id', txId);
  if (error) throw new DatabaseError(`Failed to update transaction: ${error.message}`);
}

export async function getTransactionById(
  db: SupabaseClient,
  txId: string,
): Promise<Transaction | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', txId).single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get transaction: ${error.message}`);
  return (data as Transaction) ?? null;
}
