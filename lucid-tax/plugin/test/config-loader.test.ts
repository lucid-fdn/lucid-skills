import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/core/config/loader.js';

describe('Config Loader', () => {
  const validEnv = {
    TAX_SUPABASE_URL: 'http://localhost:54321',
    TAX_SUPABASE_KEY: 'test-key',
    TAX_TENANT_ID: 'test-tenant',
  };

  it('should load valid configuration', () => {
    const config = loadConfig(validEnv);
    expect(config.supabaseUrl).toBe('http://localhost:54321');
    expect(config.supabaseKey).toBe('test-key');
    expect(config.tenantId).toBe('test-tenant');
  });

  it('should apply default jurisdiction and method', () => {
    const config = loadConfig(validEnv);
    expect(config.defaultJurisdiction).toBe('us');
    expect(config.defaultCostBasisMethod).toBe('fifo');
  });

  it('should apply default tax year as current year', () => {
    const config = loadConfig(validEnv);
    expect(config.taxYear).toBe(new Date().getFullYear());
  });

  it('should throw on missing SUPABASE_URL', () => {
    expect(() => loadConfig({ ...validEnv, TAX_SUPABASE_URL: undefined })).toThrow(
      'TAX_SUPABASE_URL is required',
    );
  });

  it('should throw on missing SUPABASE_KEY', () => {
    expect(() => loadConfig({ ...validEnv, TAX_SUPABASE_KEY: undefined })).toThrow(
      'TAX_SUPABASE_KEY is required',
    );
  });

  it('should throw on invalid jurisdiction', () => {
    expect(() =>
      loadConfig({ ...validEnv, TAX_DEFAULT_JURISDICTION: 'mars' }),
    ).toThrow('Invalid jurisdiction');
  });

  it('should load optional API keys', () => {
    const config = loadConfig({
      ...validEnv,
      TAX_ETHERSCAN_API_KEY: 'ethkey',
      TAX_COINGECKO_API_KEY: 'cgkey',
    });
    expect(config.etherscanApiKey).toBe('ethkey');
    expect(config.coingeckoApiKey).toBe('cgkey');
    expect(config.solscanApiKey).toBeUndefined();
  });
});
