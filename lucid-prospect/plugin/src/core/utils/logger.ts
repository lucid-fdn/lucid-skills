const PREFIX = '[prospect]';

export const logger = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  debug: (...args: unknown[]) => {
    if (process.env.PROSPECT_DEBUG === 'true') {
      console.debug(PREFIX, ...args);
    }
  },
};
