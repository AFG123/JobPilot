export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN = /^(password|token|secret|authorization|cookie|phone|email|candidate|apiKey|api_key|access_token|refresh_token)$/i;

function maskUrlCredentials(val: string): string {
  return val.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1***$3');
}

/**
 * Recursively redacts sensitive keys and masks credential strings in URLs.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === 'string') {
    return maskUrlCredentials(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitiveData(value);
      }
    }
    return result;
  }
  return data;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown> | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
}

export class Logger {
  private minLevel: LogLevel;
  private isJson: boolean;

  constructor(minLevel: LogLevel = 'info', isJson = false) {
    this.minLevel = minLevel;
    this.isJson = isJson;
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public setJson(json: boolean): void {
    this.isJson = json;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[this.minLevel];
  }

  private formatMessage(entry: LogEntry): string {
    if (this.isJson) {
      return JSON.stringify(entry);
    }

    const time = entry.timestamp.split('T')[1]?.replace('Z', '') ?? entry.timestamp;
    const prefix = `[${time}] [${entry.level.toUpperCase()}]`;
    const metaStr = entry.meta && Object.keys(entry.meta).length > 0 ? ` ${JSON.stringify(entry.meta)}` : '';
    const errStr = entry.error ? `\n  Error: ${entry.error.name}: ${entry.error.message}${entry.error.stack ? `\n${entry.error.stack}` : ''}` : '';
    return `${prefix} ${entry.message}${metaStr}${errStr}`;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>, err?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const sanitizedMessage = typeof message === 'string' ? maskUrlCredentials(message) : message;
    const sanitizedMeta = meta ? (redactSensitiveData(meta) as Record<string, unknown>) : undefined;

    const entry: LogEntry = {
      level,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      ...(sanitizedMeta && Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {}),
      ...(err
        ? {
            error: {
              name: err.name,
              message: maskUrlCredentials(err.message),
              stack: err.stack ? maskUrlCredentials(err.stack) : undefined,
            },
          }
        : {}),
    };

    const formatted = this.formatMessage(entry);
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>, err?: Error): void {
    this.write('warn', message, meta, err);
  }

  public error(message: string, meta?: Record<string, unknown>, err?: Error): void {
    this.write('error', message, meta, err);
  }
}

export const logger = new Logger(
  (process.env['LOG_LEVEL'] as LogLevel) || 'info',
  process.env['NODE_ENV'] === 'production'
);
