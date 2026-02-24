// ---------------------------------------------------------------------------
// Lucid Invoice — Lightweight Logger
// ---------------------------------------------------------------------------

const PREFIX = '[invoice]' as const;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function ts(): string {
  return new Date().toISOString();
}

export const logger = {
  debug(msg: string, ...args: unknown[]): void {
    if (shouldLog('debug')) console.debug(`${PREFIX} ${ts()} [DEBUG]`, msg, ...args);
  },
  info(msg: string, ...args: unknown[]): void {
    if (shouldLog('info')) console.info(`${PREFIX} ${ts()} [INFO]`, msg, ...args);
  },
  warn(msg: string, ...args: unknown[]): void {
    if (shouldLog('warn')) console.warn(`${PREFIX} ${ts()} [WARN]`, msg, ...args);
  },
  error(msg: string, ...args: unknown[]): void {
    if (shouldLog('error')) console.error(`${PREFIX} ${ts()} [ERROR]`, msg, ...args);
  },
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },
  getLevel(): LogLevel {
    return currentLevel;
  },
};
