// ---------------------------------------------------------------------------
// mocks.ts -- Reusable mock factories for tests
// ---------------------------------------------------------------------------

import { vi } from 'vitest';

/** Create a mock Supabase client with chainable query builder. */
export function createMockSupabaseClient() {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    _query: mockQuery, // for test access
  };
}
