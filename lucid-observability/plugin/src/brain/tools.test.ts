import { describe, it, expect, beforeAll } from 'vitest';
import { createBrainTools } from './tools.js';
import type { ToolDefinition } from '../tools/index.js';
import { loadConfig } from '../config.js';

describe('brain tools', () => {
  let tools: ToolDefinition[];

  beforeAll(() => {
    const config = loadConfig({});
    tools = createBrainTools({ config });
  });

  it('creates exactly 5 tools', () => {
    expect(tools).toHaveLength(5);
  });

  it('tool names match brain convention', () => {
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'lucid_diagnose',
      'lucid_obs_pro',
      'lucid_outbox_health',
      'lucid_readiness',
      'lucid_triage',
    ]);
  });

  describe('lucid_triage', () => {
    it('returns JSON by default with structured TriageResult', async () => {
      const triage = tools.find((t) => t.name === 'lucid_triage')!;
      const result = await triage.execute({
        title: 'LiteLLM timeout on proxy',
        level: 'error',
        count: 50,
        userCount: 5,
        lastSeen: new Date().toISOString(),
      });
      const parsed = JSON.parse(result);
      expect(parsed.severity).toBeDefined();
      expect(parsed.category).toBe('litellm_timeout');
      expect(parsed.temporalPattern).toBe('unknown');
      expect(parsed.confidence).toBeGreaterThan(0);
    });

    it('returns text when format=text', async () => {
      const triage = tools.find((t) => t.name === 'lucid_triage')!;
      const result = await triage.execute({
        title: 'Database connection error',
        format: 'text',
      });
      expect(result).toContain('TRIAGE:');
      expect(result).toContain('RECOMMENDATION:');
    });
  });

  describe('lucid_readiness', () => {
    it('returns readiness result', async () => {
      const readiness = tools.find((t) => t.name === 'lucid_readiness')!;
      const result = await readiness.execute({
        environment: 'production',
        env_vars: {
          SENTRY_DSN: 'https://key@sentry.io/123',
          OTEL_HASH_SALT: 'abc',
        },
      });
      const parsed = JSON.parse(result);
      expect(parsed.score).toBeDefined();
      expect(parsed.isReady).toBeDefined();
      expect(parsed.checks).toBeDefined();
    });
  });

  describe('lucid_outbox_health', () => {
    it('returns outbox health result', async () => {
      const outbox = tools.find((t) => t.name === 'lucid_outbox_health')!;
      const result = await outbox.execute({
        pending: 10,
        sent: 500,
        dead_letter: 0,
        leased: 2,
        total: 512,
        stuck_leases: 0,
      });
      const parsed = JSON.parse(result);
      expect(parsed.isHealthy).toBe(true);
      expect(parsed.alerts).toHaveLength(0);
    });
  });

  describe('lucid_diagnose', () => {
    it('returns diagnosis result', async () => {
      const diagnose = tools.find((t) => t.name === 'lucid_diagnose')!;
      const result = await diagnose.execute({
        title: 'Zod parse error: invalid input',
      });
      const parsed = JSON.parse(result);
      expect(parsed.category).toBe('validation_error');
      expect(parsed.confidence).toBeGreaterThan(0);
    });
  });

  describe('lucid_obs_pro', () => {
    it('lists available tools', async () => {
      const pro = tools.find((t) => t.name === 'lucid_obs_pro')!;
      const result = await pro.execute({ tool: 'list_tools' });
      const parsed = JSON.parse(result);
      expect(parsed.tools.length).toBe(5);
      expect(parsed.tools.map((t: { name: string }) => t.name)).toContain('score_severity');
      expect(parsed.tools.map((t: { name: string }) => t.name)).toContain('detect_temporal');
    });

    it('executes a pro tool directly', async () => {
      const pro = tools.find((t) => t.name === 'lucid_obs_pro')!;
      const result = await pro.execute({
        tool: 'score_severity',
        params: { level: 'fatal', count: 1, userCount: 1, lastSeen: new Date().toISOString() },
      });
      expect(JSON.parse(result)).toBe('critical');
    });

    it('returns error for unknown tool', async () => {
      const pro = tools.find((t) => t.name === 'lucid_obs_pro')!;
      const result = await pro.execute({ tool: 'nonexistent_tool' });
      expect(result).toContain('not found');
    });
  });
});
