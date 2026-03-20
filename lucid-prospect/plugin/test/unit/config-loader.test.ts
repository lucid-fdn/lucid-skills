import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/core/config/loader.js';

describe('Config Loader', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env to known state
    process.env.PROSPECT_SUPABASE_URL = 'http://localhost:54321';
    process.env.PROSPECT_SUPABASE_KEY = 'test-key';
  });

  afterEach(() => {
    // Restore
    process.env = { ...originalEnv };
  });

  it('should load config from env vars', () => {
    process.env.PROSPECT_TENANT_ID = 'my-tenant';
    const config = loadConfig();
    expect(config.supabaseUrl).toBe('http://localhost:54321');
    expect(config.supabaseKey).toBe('test-key');
    expect(config.tenantId).toBe('my-tenant');
  });

  it('should use defaults for optional fields', () => {
    const config = loadConfig();
    expect(config.tenantId).toBe('default');
    expect(config.defaultScoreThreshold).toBe(50);
    expect(config.enrichSchedule).toBe('0 2 * * *');
  });

  it('should throw on missing supabaseUrl', () => {
    delete process.env.PROSPECT_SUPABASE_URL;
    expect(() => loadConfig()).toThrowError(/supabaseUrl/);
  });

  it('should throw on missing supabaseKey', () => {
    delete process.env.PROSPECT_SUPABASE_KEY;
    expect(() => loadConfig()).toThrowError(/supabaseKey/);
  });

  it('should merge overrides', () => {
    const config = loadConfig({ tenantId: 'override-tenant', defaultScoreThreshold: 75 });
    expect(config.tenantId).toBe('override-tenant');
    expect(config.defaultScoreThreshold).toBe(75);
  });

  it('should parse numeric env vars', () => {
    process.env.PROSPECT_DEFAULT_SCORE_THRESHOLD = '80';
    const config = loadConfig();
    expect(config.defaultScoreThreshold).toBe(80);
  });

  it('should load optional provider keys', () => {
    process.env.PROSPECT_APOLLO_API_KEY = 'apollo-key';
    process.env.PROSPECT_HUNTER_API_KEY = 'hunter-key';
    const config = loadConfig();
    expect(config.apolloApiKey).toBe('apollo-key');
    expect(config.hunterApiKey).toBe('hunter-key');
  });
});
