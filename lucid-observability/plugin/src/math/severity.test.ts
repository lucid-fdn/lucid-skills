import { describe, it, expect } from 'vitest';
import { scoreSeverity } from './severity.js';

describe('scoreSeverity', () => {
  it('returns critical for fatal level', () => {
    expect(scoreSeverity({
      level: 'fatal',
      count: 1,
      userCount: 1,
      lastSeen: new Date().toISOString(),
    })).toBe('critical');
  });

  it('returns critical for count > 1000', () => {
    expect(scoreSeverity({
      level: 'error',
      count: 1500,
      userCount: 5,
      lastSeen: new Date(Date.now() - 86_400_000).toISOString(), // 1 day ago
    })).toBe('critical');
  });

  it('returns critical for count > 100 and last seen within 1 hour', () => {
    expect(scoreSeverity({
      level: 'error',
      count: 150,
      userCount: 5,
      lastSeen: new Date(Date.now() - 600_000).toISOString(), // 10 min ago
    })).toBe('critical');
  });

  it('returns high for error with count > 100 but old lastSeen', () => {
    expect(scoreSeverity({
      level: 'error',
      count: 150,
      userCount: 5,
      lastSeen: new Date(Date.now() - 7_200_000).toISOString(), // 2 hours ago
    })).toBe('high');
  });

  it('returns high for error with userCount > 10', () => {
    expect(scoreSeverity({
      level: 'error',
      count: 50,
      userCount: 15,
      lastSeen: new Date(Date.now() - 7_200_000).toISOString(),
    })).toBe('high');
  });

  it('returns medium for error with count > 10', () => {
    expect(scoreSeverity({
      level: 'error',
      count: 25,
      userCount: 3,
      lastSeen: new Date(Date.now() - 7_200_000).toISOString(),
    })).toBe('medium');
  });

  it('returns low for warning level with low count', () => {
    expect(scoreSeverity({
      level: 'warning',
      count: 5,
      userCount: 1,
      lastSeen: new Date().toISOString(),
    })).toBe('low');
  });

  it('returns low for error with count <= 10', () => {
    expect(scoreSeverity({
      level: 'error',
      count: 8,
      userCount: 2,
      lastSeen: new Date(Date.now() - 7_200_000).toISOString(),
    })).toBe('low');
  });
});
