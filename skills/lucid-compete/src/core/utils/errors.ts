// ---------------------------------------------------------------------------
// errors.ts -- Custom error classes for the compete plugin
// ---------------------------------------------------------------------------

/** Error thrown during HTTP fetch operations. */
export class FetchError extends Error {
  readonly code = 'FETCH_ERROR';
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FetchError';
  }
}

/** Error thrown during database operations. */
export class DatabaseError extends Error {
  readonly code = 'DATABASE_ERROR';
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseError';
  }
}

/** Error thrown for invalid or missing configuration. */
export class ConfigError extends Error {
  readonly code = 'CONFIG_ERROR';
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigError';
  }
}

/** Error thrown during alert delivery. */
export class AlertError extends Error {
  readonly code = 'ALERT_ERROR';
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertError';
  }
}
