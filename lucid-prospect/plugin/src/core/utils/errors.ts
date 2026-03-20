export class FetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public url?: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation?: string,
    public table?: string,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class EnrichmentError extends Error {
  constructor(
    message: string,
    public entityType?: string,
    public entityId?: string,
  ) {
    super(message);
    this.name = 'EnrichmentError';
  }
}
