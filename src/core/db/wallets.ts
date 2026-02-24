import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaxWallet, TaxWalletInsert } from '../types/database.js';
import { DatabaseError } from '../utils/errors.js';

const TABLE = 'tax_wallets';

export async function insertWallet(db: SupabaseClient, wallet: TaxWalletInsert): Promise<TaxWallet> {
  const { data, error } = await db.from(TABLE).insert(wallet).select().single();
  if (error) throw new DatabaseError(`Failed to insert wallet: ${error.message}`);
  return data as TaxWallet;
}

export async function getWalletById(db: SupabaseClient, id: string): Promise<TaxWallet | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(`Failed to get wallet: ${error.message}`);
  return (data as TaxWallet) ?? null;
}

export async function getWalletsByTenant(db: SupabaseClient, tenantId: string): Promise<TaxWallet[]> {
  const { data, error } = await db.from(TABLE).select('*').eq('tenant_id', tenantId).order('imported_at', { ascending: false });
  if (error) throw new DatabaseError(`Failed to list wallets: ${error.message}`);
  return (data as TaxWallet[]) ?? [];
}

export async function findWalletByAddress(
  db: SupabaseClient,
  tenantId: string,
  address: string,
  chain: string,
): Promise<TaxWallet | null> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('address', address.toLowerCase())
    .eq('chain', chain)
    .single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(`Failed to find wallet: ${error.message}`);
  return (data as TaxWallet) ?? null;
}
