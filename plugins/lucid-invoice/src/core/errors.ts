// ---------------------------------------------------------------------------
// Lucid Invoice — Centralised Error Hierarchy
// ---------------------------------------------------------------------------

/**
 * Base error class for all Lucid Invoice operations.
 * Consumers can instanceof-check for InvoiceError to distinguish
 * domain errors from unexpected runtime errors.
 */
export class InvoiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'INVOICE_ERROR', statusCode = 500) {
    super(message);
    this.name = 'InvoiceError';
    this.code = code;
    this.statusCode = statusCode;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a requested resource (client, invoice, etc.) is not found. */
export class NotFoundError extends InvoiceError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/** Thrown when input validation fails. */
export class ValidationError extends InvoiceError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/** Thrown when a database operation fails. */
export class DatabaseError extends InvoiceError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

/** Thrown when a payment provider operation fails. */
export class PaymentProviderError extends InvoiceError {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`, 'PAYMENT_PROVIDER_ERROR', 502);
    this.name = 'PaymentProviderError';
  }
}

/** Thrown when configuration is missing or invalid. */
export class ConfigError extends InvoiceError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 500);
    this.name = 'ConfigError';
  }
}
