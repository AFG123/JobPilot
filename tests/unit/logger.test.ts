import { describe, it, expect, vi } from 'vitest';
import { Logger, redactSensitiveData } from '../../src/utils/logger.js';

describe('Structured Logger', () => {
  it('respects log level filtering', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const customLogger = new Logger('warn', false);

    customLogger.debug('should not appear');
    customLogger.info('should not appear either');
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('outputs warn and error to respective console channels', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const customLogger = new Logger('debug', false);

    customLogger.warn('sample warning');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain('[WARN]');
    expect(warnSpy.mock.calls[0]?.[0]).toContain('sample warning');

    customLogger.error('sample error', { code: 500 }, new Error('boom'));
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]?.[0]).toContain('[ERROR]');
    expect(errorSpy.mock.calls[0]?.[0]).toContain('boom');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('formats output as JSON when json mode is enabled', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const customLogger = new Logger('info', true);

    customLogger.info('test message', { key: 'value' });
    expect(logSpy).toHaveBeenCalledOnce();

    const output = logSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
    expect(parsed.meta).toEqual({ key: 'value' });
    expect(parsed.timestamp).toBeDefined();

    logSpy.mockRestore();
  });

  it('automatically redacts sensitive keys and masks credentials in URLs', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const customLogger = new Logger('info', true);

    customLogger.info('Connecting to database: postgresql://admin:supersecret@localhost:5432/jobpilot', {
      email: 'sensitive@candidate.local',
      token: 'jwt_secret_token_123',
      candidate: { name: 'Real Name' },
      safe_metric: 42,
    });

    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);

    // URL password masked
    expect(parsed.message).toContain('postgresql://admin:***@localhost:5432/jobpilot');
    expect(parsed.message).not.toContain('supersecret');

    // Sensitive metadata keys redacted
    expect(parsed.meta.email).toBe('[REDACTED]');
    expect(parsed.meta.token).toBe('[REDACTED]');
    expect(parsed.meta.candidate).toBe('[REDACTED]');
    expect(parsed.meta.safe_metric).toBe(42);

    logSpy.mockRestore();
  });

  it('redactSensitiveData handles nested structures correctly', () => {
    const input = {
      user: {
        email: 'test@example.com',
        profile: {
          phone: '123-456-7890',
          title: 'Software Engineer',
        },
      },
    };
    const sanitized = redactSensitiveData(input) as typeof input;
    expect(sanitized.user.email).toBe('[REDACTED]');
    expect(sanitized.user.profile.phone).toBe('[REDACTED]');
    expect(sanitized.user.profile.title).toBe('Software Engineer');
  });
});
