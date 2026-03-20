import type { SupabaseClient } from '@supabase/supabase-js';
import type { Campaign, CampaignStatus } from '../types/index.js';
import { DatabaseError } from '../utils/errors.js';
import { isoNow } from '../utils/date.js';

const TABLE = 'prospect_campaigns';

export async function createCampaign(
  db: SupabaseClient,
  tenantId: string,
  campaign: Partial<Campaign>,
): Promise<Campaign> {
  const now = isoNow();
  const record = {
    ...campaign,
    tenant_id: tenantId,
    status: campaign.status ?? 'draft',
    lead_count: campaign.lead_count ?? 0,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await db.from(TABLE).insert(record).select().single();
  if (error) throw new DatabaseError(error.message, 'insert', TABLE);
  return data as Campaign;
}

export async function getCampaignById(db: SupabaseClient, id: string): Promise<Campaign | null> {
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw new DatabaseError(error.message, 'select', TABLE);
  return (data as Campaign) ?? null;
}

export async function listCampaigns(
  db: SupabaseClient,
  tenantId: string,
  status?: CampaignStatus,
): Promise<Campaign[]> {
  let query = db.from(TABLE).select().eq('tenant_id', tenantId);
  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message, 'list', TABLE);
  return (data as Campaign[]) ?? [];
}

export async function updateCampaign(db: SupabaseClient, id: string, updates: Partial<Campaign>): Promise<Campaign> {
  const { data, error } = await db
    .from(TABLE)
    .update({ ...updates, updated_at: isoNow() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new DatabaseError(error.message, 'update', TABLE);
  return data as Campaign;
}

export async function addLeadToCampaign(db: SupabaseClient, campaignId: string, leadId: string): Promise<void> {
  const { error: leadError } = await db
    .from('prospect_leads')
    .update({ campaign_id: campaignId, updated_at: isoNow() })
    .eq('id', leadId);

  if (leadError) throw new DatabaseError(leadError.message, 'update', 'prospect_leads');

  const { count, error: countError } = await db
    .from('prospect_leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  if (countError) throw new DatabaseError(countError.message, 'count', 'prospect_leads');

  const { error: updateError } = await db
    .from(TABLE)
    .update({ lead_count: count ?? 0, updated_at: isoNow() })
    .eq('id', campaignId);

  if (updateError) throw new DatabaseError(updateError.message, 'update', TABLE);
}

export async function removeLeadFromCampaign(db: SupabaseClient, campaignId: string, leadId: string): Promise<void> {
  const { error: leadError } = await db
    .from('prospect_leads')
    .update({ campaign_id: null, updated_at: isoNow() })
    .eq('id', leadId)
    .eq('campaign_id', campaignId);

  if (leadError) throw new DatabaseError(leadError.message, 'update', 'prospect_leads');

  const { count, error: countError } = await db
    .from('prospect_leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  if (countError) throw new DatabaseError(countError.message, 'count', 'prospect_leads');

  const { error: updateError } = await db
    .from(TABLE)
    .update({ lead_count: count ?? 0, updated_at: isoNow() })
    .eq('id', campaignId);

  if (updateError) throw new DatabaseError(updateError.message, 'update', TABLE);
}
