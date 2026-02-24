// ---------------------------------------------------------------------------
// tool-registration.test.ts -- Verify all 14 tools register correctly
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { createAllTools } from '../src/core/tools/index.js';
import type { PluginConfig } from '../src/core/types/index.js';

const mockConfig: PluginConfig = {
  supabaseUrl: 'http://localhost:54321',
  supabaseKey: 'test-key',
  tenantId: 'default',
  maxContractSize: 50000,
  scanSchedule: '0 */6 * * *',
};

describe('tool registration', () => {
  it('creates exactly 14 tools', () => {
    const tools = createAllTools({ config: mockConfig });
    expect(tools.length).toBe(14);
  });

  it('all tools have unique names', () => {
    const tools = createAllTools({ config: mockConfig });
    const names = tools.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('all tools have audit_ prefix', () => {
    const tools = createAllTools({ config: mockConfig });
    for (const tool of tools) {
      expect(tool.name).toMatch(/^audit_/);
    }
  });

  it('all tools have descriptions', () => {
    const tools = createAllTools({ config: mockConfig });
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('all tools have execute functions', () => {
    const tools = createAllTools({ config: mockConfig });
    for (const tool of tools) {
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('includes all expected tool names', () => {
    const tools = createAllTools({ config: mockConfig });
    const names = tools.map((t) => t.name);
    expect(names).toContain('audit_scan_contract');
    expect(names).toContain('audit_get_security_score');
    expect(names).toContain('audit_check_reentrancy');
    expect(names).toContain('audit_check_access_control');
    expect(names).toContain('audit_analyze_gas');
    expect(names).toContain('audit_verify_contract');
    expect(names).toContain('audit_get_audit_report');
    expect(names).toContain('audit_list_audits');
    expect(names).toContain('audit_compare_contracts');
    expect(names).toContain('audit_check_upgradability');
    expect(names).toContain('audit_get_known_vulnerabilities');
    expect(names).toContain('audit_analyze_dependencies');
    expect(names).toContain('audit_generate_findings');
    expect(names).toContain('audit_status');
  });
});
