type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const timestamp = (): string => new Date().toISOString();

function write(level: LogLevel, ...args: unknown[]): void {
  const prefix = `[${timestamp()}] [${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else if (level === 'WARN') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export const logger = {
  info: (...args: unknown[]) => write('INFO', ...args),
  warn: (...args: unknown[]) => write('WARN', ...args),
  error: (...args: unknown[]) => write('ERROR', ...args),
  debug: (...args: unknown[]) => write('DEBUG', ...args),
};
