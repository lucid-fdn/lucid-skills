import { describe, it, expect } from 'vitest';
import { checkReadiness } from './readiness.js';

describe('checkReadiness', () => {
  it('returns 100% score and isReady when all vars are set for production', () => {
    const result = checkReadiness({
      SENTRY_DSN: 'https://key@sentry.io/123',
      SENTRY_AUTH_TOKEN: 'sntrys_xxx',
      OTEL_ENABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.example.com',
      OTEL_HASH_SALT: 'abc123',
      OPENMETER_ENABLED: 'true',
      OPENMETER_API_KEY: 'om_xxx',
      DATABASE_URL: 'postgresql://localhost:5432/db',
      LUCID_ENV: 'production',
    }, 'production');

    expect(result.score).toBe(100);
    expect(result.isReady).toBe(true);
    expect(result.criticalFailures).toHaveLength(0);
  });

  it('fails when SENTRY_DSN is missing in production', () => {
    const result = checkReadiness({}, 'production');
    expect(result.isReady).toBe(false);
    expect(result.criticalFailures.some((f) => f.includes('SENTRY_DSN'))).toBe(true);
  });

  it('fails when OTEL_HASH_SALT is missing in production', () => {
    const result = checkReadiness({
      SENTRY_DSN: 'https://key@sentry.io/123',
    }, 'production');
    expect(result.isReady).toBe(false);
    expect(result.criticalFailures.some((f) => f.includes('OTEL_HASH_SALT'))).toBe(true);
  });

  it('warns but does not fail for OTEL_HASH_SALT in staging', () => {
    const result = checkReadiness({
      SENTRY_DSN: 'https://key@sentry.io/123',
    }, 'staging');
    const hashCheck = result.checks.find((c) => c.variable === 'OTEL_HASH_SALT');
    expect(hashCheck?.status).toBe('warn');
  });

  it('fails when OTEL endpoint is localhost in production', () => {
    const result = checkReadiness({
      SENTRY_DSN: 'https://key@sentry.io/123',
      OTEL_ENABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
      OTEL_HASH_SALT: 'abc',
    }, 'production');
    expect(result.criticalFailures.some((f) => f.includes('OTEL'))).toBe(true);
  });

  it('skips OTEL endpoint check when OTEL is not enabled', () => {
    const result = checkReadiness({
      SENTRY_DSN: 'https://key@sentry.io/123',
      OTEL_HASH_SALT: 'abc',
    }, 'production');
    const endpointCheck = result.checks.find((c) => c.variable === 'OTEL_EXPORTER_OTLP_ENDPOINT');
    expect(endpointCheck?.status).toBe('pass');
  });

  it('fails when OPENMETER_ENABLED=true but API key is missing', () => {
    const result = checkReadiness({
      SENTRY_DSN: 'https://key@sentry.io/123',
      OTEL_HASH_SALT: 'abc',
      OPENMETER_ENABLED: 'true',
    }, 'production');
    expect(result.criticalFailures.some((f) => f.includes('OPENMETER_API_KEY'))).toBe(true);
  });

  it('score calculation is correct', () => {
    // Only SENTRY_DSN and OTEL_HASH_SALT set — some checks pass, some warn/fail
    const result = checkReadiness({
      SENTRY_DSN: 'https://key@sentry.io/123',
      OTEL_HASH_SALT: 'abc',
    }, 'production');
    // 9 total checks. SENTRY_DSN=pass, SENTRY_AUTH_TOKEN=warn, OTEL_ENABLED=warn,
    // OTEL_ENDPOINT=pass(skipped), OTEL_HASH_SALT=pass, OPENMETER_ENABLED=warn,
    // OPENMETER_API_KEY=pass(skipped), DATABASE_URL=warn, LUCID_ENV=warn
    // 4 passing / 9 total
    expect(result.score).toBe(Math.round((4 / 9) * 100));
  });
});
