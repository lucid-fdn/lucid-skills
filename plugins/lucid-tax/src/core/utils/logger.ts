const PREFIX = '[tax]';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function ts(): string {
  return new Date().toISOString();
}

export const logger = {
  setLevel(level: LogLevel) {
    currentLevel = level;
  },
  debug(msg: string, ...args: unknown[]) {
    if (shouldLog('debug')) console.debug(`${PREFIX} ${ts()} DEBUG ${msg}`, ...args);
  },
  info(msg: string, ...args: unknown[]) {
    if (shouldLog('info')) console.info(`${PREFIX} ${ts()} INFO  ${msg}`, ...args);
  },
  warn(msg: string, ...args: unknown[]) {
    if (shouldLog('warn')) console.warn(`${PREFIX} ${ts()} WARN  ${msg}`, ...args);
  },
  error(msg: string, ...args: unknown[]) {
    if (shouldLog('error')) console.error(`${PREFIX} ${ts()} ERROR ${msg}`, ...args);
  },
};
