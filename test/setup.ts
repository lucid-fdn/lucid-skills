import { vi } from 'vitest';

// Set test environment variables
process.env['TAX_SUPABASE_URL'] = process.env['TAX_SUPABASE_URL'] ?? 'http://localhost:54321';
process.env['TAX_SUPABASE_KEY'] = process.env['TAX_SUPABASE_KEY'] ?? 'test-key-for-vitest';
process.env['TAX_TENANT_ID'] = process.env['TAX_TENANT_ID'] ?? 'test-tenant';

// Suppress console output during tests
vi.spyOn(console, 'debug').mockImplementation(() => {});
