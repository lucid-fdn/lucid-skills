// ---------------------------------------------------------------------------
// math/readiness.ts -- Production readiness scoring
// ---------------------------------------------------------------------------
// Implements the environment variable checklist from
// skills/production-readiness/SKILL.md

import type { ReadinessCheck, ReadinessResult } from '../types/index.js';

// ---------------------------------------------------------------------------
// Check definitions
// ---------------------------------------------------------------------------

interface CheckDef {
  variable: string;
  category: string;
  /** Whether this check causes a fail in production (vs. warn) */
  requiredInProd: boolean;
  /** Custom check logic — returns [status, reason] */
  check: (
    value: string | undefined,
    env: Record<string, string | undefined>,
    environment: string,
  ) => ['pass' | 'warn' | 'fail', string];
}

const CHECK_DEFS: CheckDef[] = [
  {
    variable: 'SENTRY_DSN',
    category: 'Sentry',
    requiredInProd: true,
    check: (value) => {
      if (!value) return ['fail', 'SENTRY_DSN is not set — error tracking disabled'];
      return ['pass', 'Sentry DSN is configured'];
    },
  },
  {
    variable: 'SENTRY_AUTH_TOKEN',
    category: 'Sentry',
    requiredInProd: false,
    check: (value) => {
      if (!value) return ['warn', 'SENTRY_AUTH_TOKEN not set — agent cannot query Sentry API'];
      return ['pass', 'Sentry auth token is configured'];
    },
  },
  {
    variable: 'OTEL_ENABLED',
    category: 'OTel',
    requiredInProd: false,
    check: (value) => {
      if (value !== 'true') return ['warn', 'OTEL_ENABLED is not "true" — no distributed traces'];
      return ['pass', 'OpenTelemetry is enabled'];
    },
  },
  {
    variable: 'OTEL_EXPORTER_OTLP_ENDPOINT',
    category: 'OTel',
    requiredInProd: false,
    check: (value, env, environment) => {
      // Only check if OTEL is enabled
      if (env.OTEL_ENABLED !== 'true') return ['pass', 'Skipped — OTEL not enabled'];
      if (!value) return ['warn', 'OTEL endpoint not set — traces go nowhere'];
      if (environment === 'production' && (value.includes('localhost') || value.includes('127.0.0.1'))) {
        return ['fail', 'OTEL endpoint is localhost in production — traces go nowhere'];
      }
      return ['pass', 'OTEL exporter endpoint is configured'];
    },
  },
  {
    variable: 'OTEL_HASH_SALT',
    category: 'PII',
    requiredInProd: true,
    check: (value, _env, environment) => {
      if (!value) {
        if (environment === 'production') return ['fail', 'OTEL_HASH_SALT not set — PII leak in telemetry'];
        if (environment === 'staging') return ['warn', 'OTEL_HASH_SALT not set — recommended for staging'];
        return ['warn', 'OTEL_HASH_SALT not set — optional in development'];
      }
      return ['pass', 'PII hash salt is configured'];
    },
  },
  {
    variable: 'OPENMETER_ENABLED',
    category: 'Metering',
    requiredInProd: false,
    check: (value) => {
      if (value !== 'true') return ['warn', 'OPENMETER_ENABLED is not "true" — billing inaccurate'];
      return ['pass', 'OpenMeter metering is enabled'];
    },
  },
  {
    variable: 'OPENMETER_API_KEY',
    category: 'Metering',
    requiredInProd: false,
    check: (value, env) => {
      if (env.OPENMETER_ENABLED !== 'true') return ['pass', 'Skipped — OpenMeter not enabled'];
      if (!value) return ['fail', 'OPENMETER_API_KEY not set but OpenMeter is enabled — events will fail'];
      return ['pass', 'OpenMeter API key is configured'];
    },
  },
  {
    variable: 'DATABASE_URL',
    category: 'Database',
    requiredInProd: false,
    check: (value) => {
      if (!value) return ['warn', 'DATABASE_URL not set — metering queries unavailable'];
      return ['pass', 'Database URL is configured'];
    },
  },
  {
    variable: 'LUCID_ENV',
    category: 'Environment',
    requiredInProd: false,
    check: (value) => {
      if (!value) return ['warn', 'LUCID_ENV not set — environment detection unreliable'];
      return ['pass', `Environment explicitly set to ${value}`];
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check production readiness of a service by validating environment variables.
 *
 * @param env - Environment variables to check (key/value pairs)
 * @param environment - Target environment: production, staging, or development
 * @returns ReadinessResult with score, checks, failures, and warnings
 */
export function checkReadiness(
  env: Record<string, string | undefined>,
  environment: string = 'production',
): ReadinessResult {
  const checks: ReadinessCheck[] = [];
  const criticalFailures: string[] = [];
  const warnings: string[] = [];

  for (const def of CHECK_DEFS) {
    const value = env[def.variable];
    const [status, reason] = def.check(value, env, environment);

    // In development, downgrade non-critical fails to warns
    const finalStatus =
      environment === 'development' && status === 'fail' && !def.requiredInProd
        ? 'warn'
        : status;

    checks.push({
      variable: def.variable,
      category: def.category,
      status: finalStatus,
      value: value ? '***' : undefined, // Never expose actual values
      reason,
    });

    if (finalStatus === 'fail') criticalFailures.push(`${def.variable}: ${reason}`);
    if (finalStatus === 'warn') warnings.push(`${def.variable}: ${reason}`);
  }

  const passing = checks.filter((c) => c.status === 'pass').length;
  const score = Math.round((passing / checks.length) * 100);
  const isReady = criticalFailures.length === 0 && score >= 70;

  return { score, isReady, checks, criticalFailures, warnings };
}
