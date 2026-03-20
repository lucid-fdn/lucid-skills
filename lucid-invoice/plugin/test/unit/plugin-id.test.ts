// ---------------------------------------------------------------------------
// plugin-id.test.ts -- Tests for plugin identity constants
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from '../../src/core/plugin-id.js';

describe('plugin identity', () => {
  it('has correct plugin ID', () => {
    expect(PLUGIN_ID).toBe('lucid-invoice');
  });

  it('has correct plugin name', () => {
    expect(PLUGIN_NAME).toBe('Lucid Invoice');
  });

  it('has a valid semver version', () => {
    expect(PLUGIN_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('version is 1.0.0', () => {
    expect(PLUGIN_VERSION).toBe('1.0.0');
  });
});
