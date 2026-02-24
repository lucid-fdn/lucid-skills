// ---------------------------------------------------------------------------
// logger.test.ts -- Tests for logger
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../src/core/logger.js';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logger.setLevel('info'); // reset
  });

  it('logs info messages', () => {
    logger.info('test message');
    expect(console.info).toHaveBeenCalled();
  });

  it('logs warn messages', () => {
    logger.warn('warning');
    expect(console.warn).toHaveBeenCalled();
  });

  it('logs error messages', () => {
    logger.error('error');
    expect(console.error).toHaveBeenCalled();
  });

  it('suppresses debug when level is info', () => {
    logger.setLevel('info');
    logger.debug('should not appear');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('shows debug when level is debug', () => {
    logger.setLevel('debug');
    logger.debug('should appear');
    expect(console.debug).toHaveBeenCalled();
  });

  it('suppresses info when level is warn', () => {
    logger.setLevel('warn');
    logger.info('should not appear');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('suppresses warn when level is error', () => {
    logger.setLevel('error');
    logger.warn('should not appear');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('getLevel returns current level', () => {
    logger.setLevel('debug');
    expect(logger.getLevel()).toBe('debug');
  });

  it('includes [invoice] prefix', () => {
    logger.info('check prefix');
    const call = (console.info as any).mock.calls[0];
    expect(call[0]).toContain('[invoice]');
  });

  it('includes timestamp in output', () => {
    logger.info('check timestamp');
    const call = (console.info as any).mock.calls[0];
    // ISO timestamp pattern
    expect(call[0]).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
