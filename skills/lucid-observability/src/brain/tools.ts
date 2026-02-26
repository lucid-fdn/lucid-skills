// ---------------------------------------------------------------------------
// brain/tools.ts -- 5 brain MCP tools for Lucid Observability
// ---------------------------------------------------------------------------

import type { ToolDefinition } from '../tools/index.js';
import type { PluginConfig } from '../config.js';
import { runTriage } from './analysis.js';
import { scoreSeverity } from '../math/severity.js';
import { detectTemporalPattern } from '../math/temporal.js';
import { diagnoseIssue } from '../math/diagnosis.js';
import { checkReadiness } from '../math/readiness.js';
import { analyzeOutboxHealth } from '../math/outbox.js';
import {
  formatTriageResult,
  formatReadinessResult,
  formatOutboxResult,
  formatDiagnosisResult,
} from './formatter.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BrainDeps {
  config: PluginConfig;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createBrainTools(deps: BrainDeps): ToolDefinition[] {
  const { config } = deps;

  // -----------------------------------------------------------------------
  // 1. lucid_triage — Full triage of a Sentry issue
  // -----------------------------------------------------------------------
  const lucidTriage: ToolDefinition = {
    name: 'lucid_triage',
    description:
      'Analyze a Sentry issue for severity, temporal pattern, and root cause diagnosis. Combines severity scoring, pattern detection, and keyword matching into a structured triage result.',
    params: {
      title: { type: 'string', required: true, description: 'Issue title from Sentry' },
      level: { type: 'string', description: 'Sentry level (fatal, error, warning, info)' },
      count: { type: 'number', description: 'Total event count' },
      userCount: { type: 'number', description: 'Affected user count' },
      lastSeen: { type: 'string', description: 'ISO 8601 timestamp of last occurrence' },
      culprit: { type: 'string', description: 'Culprit string from Sentry' },
      stackTrace: { type: 'string', description: 'Stack trace text' },
      timestamps: { type: 'array', description: 'Array of event timestamps (ms) for temporal analysis' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json', description: 'Output format' },
    },
    execute: async (params: Record<string, unknown>) => {
      const issue = {
        id: 'inline',
        title: params.title as string,
        level: (params.level as string) ?? 'error',
        count: (params.count as number) ?? 1,
        userCount: (params.userCount as number) ?? 0,
        firstSeen: (params.lastSeen as string) ?? new Date().toISOString(),
        lastSeen: (params.lastSeen as string) ?? new Date().toISOString(),
        culprit: params.culprit as string | undefined,
        stackTrace: params.stackTrace as string | undefined,
      };

      const timestamps = params.timestamps as number[] | undefined;
      const format = (params.format as string) ?? 'json';

      const result = runTriage(issue, timestamps);

      if (format === 'text') return formatTriageResult(result);
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 2. lucid_readiness — Production readiness check
  // -----------------------------------------------------------------------
  const lucidReadiness: ToolDefinition = {
    name: 'lucid_readiness',
    description:
      'Check production readiness of a service by validating environment variables against the observability checklist. Returns a score, pass/warn/fail per variable, and critical failures.',
    params: {
      environment: {
        type: 'enum',
        values: ['production', 'staging', 'development'],
        default: 'production',
        description: 'Target environment',
      },
      env_vars: {
        type: 'object',
        required: true,
        description: 'Environment variables to check (key/value pairs). Keys: SENTRY_DSN, SENTRY_AUTH_TOKEN, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_HASH_SALT, OPENMETER_ENABLED, OPENMETER_API_KEY, DATABASE_URL, LUCID_ENV',
      },
      format: { type: 'enum', values: ['json', 'text'], default: 'json', description: 'Output format' },
    },
    execute: async (params: Record<string, unknown>) => {
      const environment = (params.environment as string) ?? config.environment;
      const envVars = (params.env_vars as Record<string, string | undefined>) ?? {};
      const format = (params.format as string) ?? 'json';

      const result = checkReadiness(envVars, environment);

      if (format === 'text') return formatReadinessResult(result);
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 3. lucid_outbox_health — Outbox health analysis
  // -----------------------------------------------------------------------
  const lucidOutboxHealth: ToolDefinition = {
    name: 'lucid_outbox_health',
    description:
      'Analyze OpenMeter outbox health from queue statistics. Applies thresholds to detect queue backup, dead letters, stuck leases, and zero throughput.',
    params: {
      pending: { type: 'number', required: true, description: 'Pending events (unsent, attempts < 10)' },
      sent: { type: 'number', required: true, description: 'Successfully sent events' },
      dead_letter: { type: 'number', required: true, description: 'Dead letter events (attempts >= 10)' },
      leased: { type: 'number', required: true, description: 'Currently leased events' },
      total: { type: 'number', required: true, description: 'Total events in time window' },
      stuck_leases: { type: 'number', required: true, description: 'Leases expired but not released' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json', description: 'Output format' },
    },
    execute: async (params: Record<string, unknown>) => {
      const format = (params.format as string) ?? 'json';

      const result = analyzeOutboxHealth({
        pending: (params.pending as number) ?? 0,
        sent: (params.sent as number) ?? 0,
        deadLetter: (params.dead_letter as number) ?? 0,
        leased: (params.leased as number) ?? 0,
        total: (params.total as number) ?? 0,
        stuckLeases: (params.stuck_leases as number) ?? 0,
      });

      if (format === 'text') return formatOutboxResult(result);
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 4. lucid_diagnose — Pattern match an error
  // -----------------------------------------------------------------------
  const lucidDiagnose: ToolDefinition = {
    name: 'lucid_diagnose',
    description:
      'Pattern-match an error title, culprit, and stack trace against 12 known diagnosis categories (litellm_timeout, openmeter_timeout, privy_auth, mcp_server_down, network_error, timeout, auth_error, rate_limit, database_error, validation_error, memory_leak, application_error).',
    params: {
      title: { type: 'string', required: true, description: 'Error title or message' },
      culprit: { type: 'string', description: 'Culprit string (file/function that threw)' },
      stack_trace: { type: 'string', description: 'Full stack trace text' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json', description: 'Output format' },
    },
    execute: async (params: Record<string, unknown>) => {
      const title = params.title as string;
      const culprit = params.culprit as string | undefined;
      const stackTrace = params.stack_trace as string | undefined;
      const format = (params.format as string) ?? 'json';

      const result = diagnoseIssue(title, culprit, stackTrace);

      if (format === 'text') return formatDiagnosisResult(result);
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 5. lucid_obs_pro — Direct access to individual functions
  // -----------------------------------------------------------------------
  const lucidObsPro: ToolDefinition = {
    name: 'lucid_obs_pro',
    description:
      'Direct access to observability analysis functions. Use list_tools to see available tools, or call one directly.',
    params: {
      tool: { type: 'string', required: true, description: 'Tool name or "list_tools"' },
      params: { type: 'object', description: 'Tool parameters' },
    },
    execute: async (params: Record<string, unknown>) => {
      const tool = params.tool as string;
      const toolParams = (params.params as Record<string, unknown>) ?? {};

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const proTools: Record<string, (p: any) => unknown> = {
        score_severity: (p) => scoreSeverity({
          level: p.level ?? 'error',
          count: p.count ?? 1,
          userCount: p.userCount ?? 0,
          lastSeen: p.lastSeen ?? new Date().toISOString(),
        }),
        detect_temporal: (p) => detectTemporalPattern(p.timestamps ?? []),
        diagnose_issue: (p) => diagnoseIssue(p.title ?? '', p.culprit, p.stackTrace),
        check_readiness: (p) => checkReadiness(p.envVars ?? {}, p.environment ?? 'production'),
        analyze_outbox: (p) => analyzeOutboxHealth({
          pending: p.pending ?? 0,
          sent: p.sent ?? 0,
          deadLetter: p.deadLetter ?? 0,
          leased: p.leased ?? 0,
          total: p.total ?? 0,
          stuckLeases: p.stuckLeases ?? 0,
        }),
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (tool === 'list_tools') {
        return JSON.stringify({
          tools: Object.keys(proTools).map((name) => ({ name, type: 'math' })),
        });
      }

      const fn = proTools[tool];
      if (!fn) return JSON.stringify({ error: `Tool "${tool}" not found. Use list_tools to see available tools.` });

      try {
        const result = fn(toolParams);
        return JSON.stringify(result);
      } catch (err) {
        return JSON.stringify({ error: `Tool "${tool}" failed: ${err instanceof Error ? err.message : String(err)}` });
      }
    },
  };

  return [lucidTriage, lucidReadiness, lucidOutboxHealth, lucidDiagnose, lucidObsPro];
}
