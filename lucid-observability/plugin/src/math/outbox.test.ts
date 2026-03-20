import { describe, it, expect } from 'vitest';
import { analyzeOutboxHealth } from './outbox.js';

describe('analyzeOutboxHealth', () => {
  it('returns healthy when all stats are within thresholds', () => {
    const result = analyzeOutboxHealth({
      pending: 10,
      sent: 500,
      deadLetter: 0,
      leased: 2,
      total: 512,
      stuckLeases: 0,
    });
    expect(result.isHealthy).toBe(true);
    expect(result.alerts).toHaveLength(0);
  });

  it('alerts on high pending queue (>500)', () => {
    const result = analyzeOutboxHealth({
      pending: 750,
      sent: 100,
      deadLetter: 0,
      leased: 5,
      total: 855,
      stuckLeases: 0,
    });
    expect(result.isHealthy).toBe(false);
    expect(result.alerts.some((a) => a.includes('Queue depth'))).toBe(true);
  });

  it('alerts on dead letters (>0)', () => {
    const result = analyzeOutboxHealth({
      pending: 10,
      sent: 100,
      deadLetter: 3,
      leased: 0,
      total: 113,
      stuckLeases: 0,
    });
    expect(result.isHealthy).toBe(false);
    expect(result.alerts.some((a) => a.includes('dead letter'))).toBe(true);
  });

  it('alerts on stuck leases (>0)', () => {
    const result = analyzeOutboxHealth({
      pending: 10,
      sent: 100,
      deadLetter: 0,
      leased: 5,
      total: 115,
      stuckLeases: 2,
    });
    expect(result.isHealthy).toBe(false);
    expect(result.alerts.some((a) => a.includes('stuck lease'))).toBe(true);
  });

  it('alerts CRITICAL when sent=0 but total>0', () => {
    const result = analyzeOutboxHealth({
      pending: 50,
      sent: 0,
      deadLetter: 0,
      leased: 0,
      total: 50,
      stuckLeases: 0,
    });
    expect(result.isHealthy).toBe(false);
    expect(result.alerts.some((a) => a.includes('CRITICAL'))).toBe(true);
  });

  it('passes through raw stats', () => {
    const result = analyzeOutboxHealth({
      pending: 42,
      sent: 100,
      deadLetter: 5,
      leased: 3,
      total: 150,
      stuckLeases: 1,
    });
    expect(result.pending).toBe(42);
    expect(result.sent).toBe(100);
    expect(result.deadLetter).toBe(5);
    expect(result.leased).toBe(3);
    expect(result.total).toBe(150);
    expect(result.stuckLeases).toBe(1);
  });

  it('reports multiple alerts simultaneously', () => {
    const result = analyzeOutboxHealth({
      pending: 600,
      sent: 0,
      deadLetter: 10,
      leased: 5,
      total: 615,
      stuckLeases: 3,
    });
    expect(result.alerts.length).toBeGreaterThanOrEqual(3);
  });
});
