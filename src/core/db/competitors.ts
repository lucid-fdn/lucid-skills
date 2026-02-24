// ---------------------------------------------------------------------------
// competitors.ts -- CRUD operations for the competitors table
// ---------------------------------------------------------------------------

import { getSupabase } from './client.js';
import { DatabaseError } from '../utils/errors.js';
import type { Competitor, CompetitorInsert } from '../types/index.js';

/**
 * Insert a new competitor and return the created row.
 */
export async function createCompetitor(data: CompetitorInsert): Promise<Competitor> {
  const { data: row, error } = await getSupabase()
    .from('competitors')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to create competitor: ${error.message}`);
  }

  return row as Competitor;
}

/**
 * Retrieve a competitor by ID, or null if not found.
 */
export async function getCompetitor(id: number): Promise<Competitor | null> {
  const { data: row, error } = await getSupabase()
    .from('competitors')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new DatabaseError(`Failed to get competitor: ${error.message}`);
  }

  return row as Competitor;
}

/**
 * List all competitors for a tenant, ordered by created_at ascending.
 */
export async function listCompetitors(tenantId: string): Promise<Competitor[]> {
  const { data: rows, error } = await getSupabase()
    .from('competitors')
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new DatabaseError(`Failed to list competitors: ${error.message}`);
  }

  return (rows ?? []) as Competitor[];
}

/**
 * Update a competitor by ID and return the updated row.
 */
export async function updateCompetitor(
  id: number,
  data: Partial<CompetitorInsert>,
): Promise<Competitor> {
  const { data: row, error } = await getSupabase()
    .from('competitors')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new DatabaseError(`Failed to update competitor: ${error.message}`);
  }

  return row as Competitor;
}

/**
 * Delete a competitor by ID. Cascades to monitors and signals.
 */
export async function deleteCompetitor(id: number): Promise<void> {
  const { error } = await getSupabase()
    .from('competitors')
    .delete()
    .eq('id', id);

  if (error) {
    throw new DatabaseError(`Failed to delete competitor: ${error.message}`);
  }
}
