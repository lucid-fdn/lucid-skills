import { describe, it, expect } from 'vitest';
import { detectTemporalPattern } from './temporal.js';

describe('detectTemporalPattern', () => {
  it('returns unknown for fewer than 2 events', () => {
    expect(detectTemporalPattern([])).toBe('unknown');
    expect(detectTemporalPattern([1000])).toBe('unknown');
  });

  it('detects burst pattern (80%+ events in first 20% of timespan)', () => {
    const now = Date.now();
    // 10 events in 2 hours, 9 in the first 24 min (20% of 2h)
    const timestamps = [
      now,
      now + 60_000,       // 1 min
      now + 120_000,      // 2 min
      now + 180_000,      // 3 min
      now + 240_000,      // 4 min
      now + 300_000,      // 5 min
      now + 600_000,      // 10 min
      now + 900_000,      // 15 min
      now + 1_200_000,    // 20 min
      now + 7_200_000,    // 2 hours
    ];
    expect(detectTemporalPattern(timestamps)).toBe('burst');
  });

  it('detects steady pattern (low coefficient of variation)', () => {
    const now = Date.now();
    // 6 events, evenly spaced at 10-minute intervals
    const timestamps = [
      now,
      now + 600_000,
      now + 1_200_000,
      now + 1_800_000,
      now + 2_400_000,
      now + 3_000_000,
    ];
    expect(detectTemporalPattern(timestamps)).toBe('steady');
  });

  it('detects regression pattern (max gap > 5x average)', () => {
    const now = Date.now();
    // 4 events: 3 close together, then a huge gap, then 1 more
    // gaps: [60k, 60k, 18M] — mean = ~6M, max = 18M, ratio = 3x... need bigger gap
    // gaps: [60k, 60k, 60_000_000] — mean = ~20M, max = 60M, ratio = 3x
    // Better: make max gap much larger relative to avg
    // gaps: [10k, 10k, 600_000] — mean = ~207k, max = 600k, ratio = 2.9x
    // Use: gaps [10k, 10k, 1_000_000] — mean = ~340k, max = 1M, ratio = 2.9x
    // Need max > 5x mean. With 3 gaps, mean includes the max gap itself.
    // [10k, 10k, X] → mean = (20k + X)/3, need X > 5*(20k+X)/3 → 3X > 100k + 5X → -2X > 100k — impossible!
    // With 3 events (2 gaps): [10k, X] → mean = (10k+X)/2, need X > 5*(10k+X)/2 → 2X > 50k + 5X → impossible
    // Solution: need more small gaps. Use 5 events: [10k, 10k, 10k, X]
    // mean = (30k + X)/4, need X > 5*(30k+X)/4 → 4X > 150k + 5X → impossible
    // Actually the math: need maxGap > 5 * meanGap. Mean includes the max gap.
    // [a, a, a, M] → mean = (3a+M)/4, need M > 5*(3a+M)/4 → 4M > 15a+5M → -M > 15a → impossible
    // We need many small gaps to dilute the mean:
    // [a, a, a, a, a, a, a, a, a, M] → 10 gaps, mean = (9a+M)/10, need M > 5*(9a+M)/10
    // → 10M > 45a + 5M → 5M > 45a → M > 9a
    // So with a=60k: M > 540k. Use M = 600k, total span = 9*60k+600k = 1140k (~19 min < 1h, no burst check)
    const timestamps = [
      now,
      now + 60_000,
      now + 120_000,
      now + 180_000,
      now + 240_000,
      now + 300_000,
      now + 360_000,
      now + 420_000,
      now + 480_000,
      now + 540_000,
      now + 1_200_000,   // 660k gap (> 9 * 60k = 540k, so > 5x mean diluted by small gaps)
    ];
    expect(detectTemporalPattern(timestamps)).toBe('regression');
  });

  it('returns sporadic when no pattern matches', () => {
    const now = Date.now();
    // 3 events with irregular but not extreme gaps, span < 1 hour
    const timestamps = [
      now,
      now + 120_000,      // 2 min
      now + 600_000,      // 10 min (not 5x average)
    ];
    expect(detectTemporalPattern(timestamps)).toBe('sporadic');
  });

  it('handles unsorted timestamps', () => {
    const now = Date.now();
    const timestamps = [
      now + 7_200_000,
      now + 600_000,
      now,
      now + 300_000,
      now + 120_000,
      now + 180_000,
      now + 240_000,
      now + 60_000,
      now + 900_000,
      now + 1_200_000,
    ];
    // Should still detect burst (9 events in first 20 min of 2h span)
    expect(detectTemporalPattern(timestamps)).toBe('burst');
  });

  it('returns sporadic for 2 events with span < 1h', () => {
    const now = Date.now();
    // 2 events, 30 min apart (span < 1h, so burst check fails, < 5 events so steady fails)
    const timestamps = [now, now + 1_800_000];
    expect(detectTemporalPattern(timestamps)).toBe('sporadic');
  });
});
