// ---------------------------------------------------------------------------
// test/setup.ts -- Global test setup: set required env vars
// ---------------------------------------------------------------------------

process.env.INVOICE_SUPABASE_URL = 'http://localhost:54321';
process.env.INVOICE_SUPABASE_KEY = 'test-key';
process.env.INVOICE_TENANT_ID = 'test-tenant';
process.env.INVOICE_COMPANY_NAME = 'Test Company';
process.env.INVOICE_DEFAULT_CURRENCY = 'USD';
process.env.INVOICE_DEFAULT_TAX_RATE = '10';
process.env.INVOICE_DEFAULT_PAYMENT_TERMS = '30';
