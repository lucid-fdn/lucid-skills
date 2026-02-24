/**
 * Domain-specific error for the Tax plugin.
 */
export class TaxError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'TAX_ERROR', statusCode = 500) {
    super(message);
    this.name = 'TaxError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** Throw when required configuration is missing */
export class ConfigError extends TaxError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 400);
    this.name = 'ConfigError';
  }
}

/** Throw when a provider request fails */
export class ProviderError extends TaxError {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`, 'PROVIDER_ERROR', 502);
    this.name = 'ProviderError';
  }
}

/** Throw when a database operation fails */
export class DatabaseError extends TaxError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

/** Throw when a requested entity is not found */
export class NotFoundError extends TaxError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Type guard to check if an unknown value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely extract an error message from an unknown thrown value
 */
export function getErrorMessage(err: unknown): string {
  if (isError(err)) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}
