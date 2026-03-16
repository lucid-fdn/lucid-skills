// ---------------------------------------------------------------------------
// Lucid Invoice — Invoice DB Operations
// ---------------------------------------------------------------------------

import { getDbClient, getTenantId } from './client.js';
import { DatabaseError, NotFoundError } from '../core/errors.js';
import type { InvoiceRow, InvoiceInsert, InvoiceUpdate } from '../types/database.js';
import type { InvoiceStatus } from '../types/common.js';

const TABLE = 'invoice_invoices';

export async function createInvoice(
  data: Omit<InvoiceInsert, 'tenant_id'>,
): Promise<InvoiceRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .insert({ ...data, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create invoice: ${error.message}`);
  return row as InvoiceRow;
}

export async function getInvoiceById(id: string): Promise<InvoiceRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', getTenantId())
    .single();
  if (error || !row) throw new NotFoundError('Invoice', id);
  return row as InvoiceRow;
}

export async function listInvoices(filters?: {
  client_id?: string;
  status?: InvoiceStatus;
  from_date?: string;
  to_date?: string;
}): Promise<InvoiceRow[]> {
  const db = getDbClient();
  let query = db.from(TABLE).select('*').eq('tenant_id', getTenantId());
  if (filters?.client_id) query = query.eq('client_id', filters.client_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.from_date) query = query.gte('issue_date', filters.from_date);
  if (filters?.to_date) query = query.lte('issue_date', filters.to_date);
  query = query.order('issue_date', { ascending: false });

  const { data: rows, error } = await query;
  if (error) throw new DatabaseError(`Failed to list invoices: ${error.message}`);
  return (rows ?? []) as InvoiceRow[];
}

export async function updateInvoice(id: string, data: InvoiceUpdate): Promise<InvoiceRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId())
    .select()
    .single();
  if (error || !row) throw new DatabaseError(`Failed to update invoice ${id}: ${error?.message}`);
  return row as InvoiceRow;
}

export async function getOutstandingInvoices(clientId?: string): Promise<InvoiceRow[]> {
  const db = getDbClient();
  let query = db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', getTenantId())
    .in('status', ['sent', 'viewed', 'overdue']);
  if (clientId) query = query.eq('client_id', clientId);
  query = query.order('due_date', { ascending: true });

  const { data: rows, error } = await query;
  if (error) throw new DatabaseError(`Failed to get outstanding invoices: ${error.message}`);
  return (rows ?? []) as InvoiceRow[];
}

export async function getInvoiceCount(): Promise<number> {
  const db = getDbClient();
  const { count, error } = await db
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', getTenantId());
  if (error) throw new DatabaseError(`Failed to count invoices: ${error.message}`);
  return count ?? 0;
}
