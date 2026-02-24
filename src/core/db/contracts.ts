// ---------------------------------------------------------------------------
// contracts.ts -- CRUD for contracts table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { getConfig } from '../config/index.js';
import { DatabaseError } from '../utils/errors.js';
import type { Contract, ContractInsert, ContractUpdate } from '../types/index.js';
import type { Chain } from '../types/index.js';

const TABLE = 'audit_contracts';

function tenantId(): string {
  return getConfig().tenantId;
}

export async function createContract(data: ContractInsert): Promise<Contract> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .insert({ ...data, tenant_id: tenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create contract: ${error.message}`);
  return row as Contract;
}

export async function getContractById(id: string): Promise<Contract | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get contract: ${error.message}`);
  return (data as Contract) ?? null;
}

export async function getContractByAddress(
  address: string,
  chain: Chain,
): Promise<Contract | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .eq('address', address.toLowerCase())
    .eq('chain', chain)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new DatabaseError(`Failed to get contract: ${error.message}`);
  return (data as Contract) ?? null;
}

export interface ListContractsOptions {
  chain?: Chain;
  limit?: number;
  offset?: number;
}

export async function listContracts(opts: ListContractsOptions = {}): Promise<Contract[]> {
  let query = getSupabase()
    .from(TABLE)
    .select()
    .eq('tenant_id', tenantId())
    .order('updated_at', { ascending: false });

  if (opts.chain) query = query.eq('chain', opts.chain);
  query = query.range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw new DatabaseError(`Failed to list contracts: ${error.message}`);
  return (data as Contract[]) ?? [];
}

export async function updateContract(id: string, updates: ContractUpdate): Promise<Contract> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId())
    .eq('id', id)
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to update contract: ${error.message}`);
  return data as Contract;
}
