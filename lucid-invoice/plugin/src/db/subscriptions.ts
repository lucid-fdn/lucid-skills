// ---------------------------------------------------------------------------
// Lucid Invoice — Subscription DB Operations
// ---------------------------------------------------------------------------

import { getDbClient, getTenantId } from './client.js';
import { DatabaseError, NotFoundError } from '../core/errors.js';
import type { SubscriptionRow, SubscriptionInsert, SubscriptionUpdate } from '../types/database.js';

const TABLE = 'invoice_subscriptions';

export async function createSubscription(
  data: Omit<SubscriptionInsert, 'tenant_id'>,
): Promise<SubscriptionRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .insert({ ...data, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw new DatabaseError(`Failed to create subscription: ${error.message}`);
  return row as SubscriptionRow;
}

export async function getSubscriptionById(id: string): Promise<SubscriptionRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', getTenantId())
    .single();
  if (error || !row) throw new NotFoundError('Subscription', id);
  return row as SubscriptionRow;
}

export async function listActiveSubscriptions(): Promise<SubscriptionRow[]> {
  const db = getDbClient();
  const { data: rows, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', getTenantId())
    .eq('status', 'active')
    .order('next_billing', { ascending: true });
  if (error) throw new DatabaseError(`Failed to list subscriptions: ${error.message}`);
  return (rows ?? []) as SubscriptionRow[];
}

export async function listSubscriptionsByClient(clientId: string): Promise<SubscriptionRow[]> {
  const db = getDbClient();
  const { data: rows, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', getTenantId())
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new DatabaseError(`Failed to list client subscriptions: ${error.message}`);
  return (rows ?? []) as SubscriptionRow[];
}

export async function updateSubscription(
  id: string,
  data: SubscriptionUpdate,
): Promise<SubscriptionRow> {
  const db = getDbClient();
  const { data: row, error } = await db
    .from(TABLE)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId())
    .select()
    .single();
  if (error || !row)
    throw new DatabaseError(`Failed to update subscription ${id}: ${error?.message}`);
  return row as SubscriptionRow;
}
