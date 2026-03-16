import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriceHistory, PriceHistoryInsert } from '../types/database.js';
import { DatabaseError } from '../utils/errors.js';

const TABLE = 'tax_price_history';

export async function upsertPrices(
  db: SupabaseClient,
  prices: PriceHistoryInsert[],
): Promise<PriceHistory[]> {
  if (prices.length === 0) return [];
  const { data, error } = await db
    .from(TABLE)
    .upsert(prices, { onConflict: 'token_symbol,date,source' })
    .select();
  if (error) throw new DatabaseError(`Failed to upsert prices: ${error.message}`);
  return (data as PriceHistory[]) ?? [];
}

export async function getPrice(
  db: SupabaseClient,
  tokenSymbol: string,
  date: string,
): Promise<PriceHistory | null> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('token_symbol', tokenSymbol.toUpperCase())
    .eq('date', date)
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get price: ${error.message}`);
  return (data as PriceHistory) ?? null;
}

export async function getPriceRange(
  db: SupabaseClient,
  tokenSymbol: string,
  startDate: string,
  endDate: string,
): Promise<PriceHistory[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('token_symbol', tokenSymbol.toUpperCase())
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  if (error) throw new DatabaseError(`Failed to get price range: ${error.message}`);
  return (data as PriceHistory[]) ?? [];
}
