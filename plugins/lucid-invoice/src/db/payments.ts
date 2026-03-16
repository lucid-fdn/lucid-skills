// ---------------------------------------------------------------------------
// Lucid Invoice — Payment DB Operations
// ---------------------------------------------------------------------------

import { getDbClient, getTenantId } from './client.js';
import { DatabaseError } from '../core/errors.js';
import type { PaymentRow, PaymentInsert } from '../types/database.js';

const TABLE = 'invoice_payments';

export async function createPayment(
  data: Omit<PaymentInsert, 'tenant_id'>,
): Promise<PaymentRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .insert({ ...data, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create payment: ${error.message}`);
  return row as PaymentRow;
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<PaymentRow[]> {
  const db = getDbClient();
  const { data: rows, error } = await db
    .from(TABLE)
    .select('*')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', getTenantId())
    .order('received_at', { ascending: false });
  if (error) throw new DatabaseError(`Failed to get payments: ${error.message}`);
  return (rows ?? []) as PaymentRow[];
}

export async function getPaymentsByDateRange(
  startDate: string,
  endDate: string,
): Promise<PaymentRow[]> {
  const db = getDbClient();
  const { data: rows, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', getTenantId())
    .gte('received_at', startDate)
    .lte('received_at', endDate)
    .order('received_at', { ascending: false });
  if (error) throw new DatabaseError(`Failed to get payments by date: ${error.message}`);
  return (rows ?? []) as PaymentRow[];
}

export async function getTotalPaymentsForInvoice(invoiceId: string): Promise<number> {
  const db = getDbClient();
  const { data: rows, error } = await db
    .from(TABLE)
    .select('amount')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', getTenantId());
  if (error) throw new DatabaseError(`Failed to sum payments: ${error.message}`);
  return (rows ?? []).reduce((sum, r) => sum + (r as { amount: number }).amount, 0);
}
