// ---------------------------------------------------------------------------
// domain.test.ts -- Tests for TradeDomainAdapter
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { tradeDomain } from './domain.js';

describe('tradeDomain adapter', () => {
  it('has correct id and name', () => {
    expect(tradeDomain.id).toBe('trade');
    expect(tradeDomain.name).toBe('Crypto Trading Intelligence');
  });

  it('canHandle returns high confidence for trading intents', () => {
    expect(tradeDomain.canHandle('analyze SOL')).toBeGreaterThan(70);
    expect(tradeDomain.canHandle('should I buy BTC?')).toBeGreaterThan(70);
    expect(tradeDomain.canHandle('open long ETH')).toBeGreaterThan(70);
    expect(tradeDomain.canHandle('what is my PnL')).toBeGreaterThan(50);
  });

  it('canHandle returns low confidence for non-trading intents', () => {
    expect(tradeDomain.canHandle('audit this smart contract')).toBeLessThan(30);
    expect(tradeDomain.canHandle('write a poem')).toBeLessThan(20);
    expect(tradeDomain.canHandle('check my Sentry errors')).toBeLessThan(20);
  });

  it('has all 6 brain methods', () => {
    expect(typeof tradeDomain.think).toBe('function');
    expect(typeof tradeDomain.scan).toBe('function');
    expect(typeof tradeDomain.execute).toBe('function');
    expect(typeof tradeDomain.watch).toBe('function');
    expect(typeof tradeDomain.protect).toBe('function');
    expect(typeof tradeDomain.review).toBe('function');
  });

  it('has proTools array', () => {
    expect(Array.isArray(tradeDomain.proTools)).toBe(true);
    expect(tradeDomain.proTools.length).toBeGreaterThan(0);
  });
});
