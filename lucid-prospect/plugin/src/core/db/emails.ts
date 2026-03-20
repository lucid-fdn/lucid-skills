import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailVerification, EmailStatus } from '../types/index.js';
import { DatabaseError } from '../utils/errors.js';
import { isoNow } from '../utils/date.js';

const TABLE = 'prospect_email_verifications';

export async function upsertVerification(
  db: SupabaseClient,
  email: string,
  status: EmailStatus,
  provider: string,
  details: {
    mx_found?: boolean;
    smtp_check?: boolean;
    is_catch_all?: boolean;
    is_disposable?: boolean;
  } = {},
): Promise<EmailVerification> {
  const record = {
    email,
    status,
    provider,
    mx_found: details.mx_found ?? null,
    smtp_check: details.smtp_check ?? null,
    is_catch_all: details.is_catch_all ?? false,
    is_disposable: details.is_disposable ?? false,
    verified_at: isoNow(),
  };

  const { data, error } = await db
    .from(TABLE)
    .upsert(record, { onConflict: 'email' })
    .select()
    .single();

  if (error) throw new DatabaseError(error.message, 'upsert', TABLE);
  return data as EmailVerification;
}

export async function getVerification(db: SupabaseClient, email: string): Promise<EmailVerification | null> {
  const { data, error } = await db.from(TABLE).select().eq('email', email).single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(error.message, 'select', TABLE);
  return (data as EmailVerification) ?? null;
}

export async function listVerifications(
  db: SupabaseClient,
  status?: EmailStatus,
  limit = 50,
): Promise<EmailVerification[]> {
  let query = db.from(TABLE).select();
  if (status) query = query.eq('status', status);
  query = query.order('verified_at', { ascending: false }).limit(limit);

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message, 'list', TABLE);
  return (data as EmailVerification[]) ?? [];
}
