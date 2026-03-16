// ---------------------------------------------------------------------------
// Lucid Invoice — Client DB Operations
// ---------------------------------------------------------------------------

import { getDbClient, getTenantId } from './client.js';
import { DatabaseError, NotFoundError } from '../core/errors.js';
import type { ClientRow, ClientInsert, ClientUpdate } from '../types/database.js';
import type { ClientStatus } from '../types/common.js';

const TABLE = 'invoice_clients';

export async function createClient(data: Omit<ClientInsert, 'tenant_id'>): Promise<ClientRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .insert({ ...data, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create client: ${error.message}`);
  return row as ClientRow;
}

export async function getClientById(id: string): Promise<ClientRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', getTenantId())
    .single();
  if (error || !row) throw new NotFoundError('Client', id);
  return row as ClientRow;
}

export async function listClients(filters?: {
  status?: ClientStatus;
  search?: string;
}): Promise<ClientRow[]> {
  const db = getDbClient();
  let query = db.from(TABLE).select('*').eq('tenant_id', getTenantId());
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
  query = query.order('created_at', { ascending: false });

  const { data: rows, error } = await query;
  if (error) throw new DatabaseError(`Failed to list clients: ${error.message}`);
  return (rows ?? []) as ClientRow[];
}

export async function updateClient(id: string, data: ClientUpdate): Promise<ClientRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId())
    .select()
    .single();
  if (error || !row) throw new DatabaseError(`Failed to update client ${id}: ${error?.message}`);
  return row as ClientRow;
}
