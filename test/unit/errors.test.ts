// ---------------------------------------------------------------------------
// errors.test.ts -- Tests for error hierarchy
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  InvoiceError,
  NotFoundError,
  ValidationError,
  DatabaseError,
  PaymentProviderError,
  ConfigError,
} from '../../src/core/errors.js';

describe('InvoiceError', () => {
  it('creates with default code and status', () => {
    const err = new InvoiceError('test message');
    expect(err.message).toBe('test message');
    expect(err.code).toBe('INVOICE_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('InvoiceError');
  });

  it('accepts custom code and status', () => {
    const err = new InvoiceError('custom', 'CUSTOM', 418);
    expect(err.code).toBe('CUSTOM');
    expect(err.statusCode).toBe(418);
  });

  it('is instanceof Error', () => {
    const err = new InvoiceError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(InvoiceError);
  });
});

describe('NotFoundError', () => {
  it('formats message with resource and id', () => {
    const err = new NotFoundError('Client', 'abc-123');
    expect(err.message).toBe('Client not found: abc-123');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('NotFoundError');
  });

  it('is instanceof InvoiceError', () => {
    const err = new NotFoundError('Invoice', 'xyz');
    expect(err).toBeInstanceOf(InvoiceError);
  });
});

describe('ValidationError', () => {
  it('creates with message', () => {
    const err = new ValidationError('invalid email');
    expect(err.message).toBe('invalid email');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('ValidationError');
  });

  it('is instanceof InvoiceError', () => {
    expect(new ValidationError('test')).toBeInstanceOf(InvoiceError);
  });
});

describe('DatabaseError', () => {
  it('creates with message', () => {
    const err = new DatabaseError('connection failed');
    expect(err.message).toBe('connection failed');
    expect(err.code).toBe('DATABASE_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('DatabaseError');
  });

  it('is instanceof InvoiceError', () => {
    expect(new DatabaseError('test')).toBeInstanceOf(InvoiceError);
  });
});

describe('PaymentProviderError', () => {
  it('includes provider name in message', () => {
    const err = new PaymentProviderError('Stripe', 'API key expired');
    expect(err.message).toBe('[Stripe] API key expired');
    expect(err.code).toBe('PAYMENT_PROVIDER_ERROR');
    expect(err.statusCode).toBe(502);
    expect(err.name).toBe('PaymentProviderError');
  });

  it('is instanceof InvoiceError', () => {
    expect(new PaymentProviderError('PayPal', 'fail')).toBeInstanceOf(InvoiceError);
  });
});

describe('ConfigError', () => {
  it('creates with message', () => {
    const err = new ConfigError('missing key');
    expect(err.message).toBe('missing key');
    expect(err.code).toBe('CONFIG_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('ConfigError');
  });

  it('is instanceof InvoiceError', () => {
    expect(new ConfigError('test')).toBeInstanceOf(InvoiceError);
  });
});
