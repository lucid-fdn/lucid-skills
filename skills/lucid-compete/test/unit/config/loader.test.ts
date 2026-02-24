// ---------------------------------------------------------------------------
// loader.test.ts -- Tests for config loader
// ---------------------------------------------------------------------------

import { loadConfig, getConfig, resetConfig } from '../../../src/core/config/loader.js';
import { CONFIG_DEFAULTS } from '../../../src/core/config/defaults.js';

describe('loadConfig', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('loads from defaults and env vars when no raw config is provided', () => {
    // test/setup.ts sets COMPETE_SUPABASE_URL and COMPETE_SUPABASE_KEY
    const config = loadConfig();
    expect(config.supabaseUrl).toBe('http://localhost:54321');
    expect(config.supabaseKey).toBe('test-key');
    expect(config.tenantId).toBe(CONFIG_DEFAULTS.tenantId);
    expect(config.fetchSchedule).toBe(CONFIG_DEFAULTS.fetchSchedule);
    expect(config.briefSchedule).toBe(CONFIG_DEFAULTS.briefSchedule);
    expect(config.alertSeverity).toBe(CONFIG_DEFAULTS.alertSeverity);
  });

  it('raw config overrides env vars', () => {
    const config = loadConfig({
      supabaseUrl: 'https://custom.supabase.co',
      supabaseKey: 'custom-key',
      tenantId: 'my-tenant',
    });
    expect(config.supabaseUrl).toBe('https://custom.supabase.co');
    expect(config.supabaseKey).toBe('custom-key');
    expect(config.tenantId).toBe('my-tenant');
  });

  it('env vars override defaults', () => {
    const origTenant = process.env.COMPETE_TENANT_ID;
    try {
      process.env.COMPETE_TENANT_ID = 'env-tenant';
      const config = loadConfig();
      expect(config.tenantId).toBe('env-tenant');
    } finally {
      if (origTenant === undefined) {
        delete process.env.COMPETE_TENANT_ID;
      } else {
        process.env.COMPETE_TENANT_ID = origTenant;
      }
    }
  });

  it('throws ConfigError when supabaseUrl is missing', () => {
    const origUrl = process.env.COMPETE_SUPABASE_URL;
    try {
      delete process.env.COMPETE_SUPABASE_URL;
      expect(() => loadConfig()).toThrow('supabaseUrl is required');
    } finally {
      process.env.COMPETE_SUPABASE_URL = origUrl;
    }
  });

  it('throws ConfigError when supabaseKey is missing', () => {
    const origKey = process.env.COMPETE_SUPABASE_KEY;
    try {
      delete process.env.COMPETE_SUPABASE_KEY;
      expect(() => loadConfig()).toThrow('supabaseKey is required');
    } finally {
      process.env.COMPETE_SUPABASE_KEY = origKey;
    }
  });
});

describe('getConfig / resetConfig', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('caches config after first load', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    expect(config1).toBe(config2); // same reference
  });

  it('resetConfig clears the cache', () => {
    const config1 = getConfig();
    resetConfig();
    const config2 = getConfig();
    // They are structurally equal but not the same reference
    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});
