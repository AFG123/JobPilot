import { describe, it, expect } from 'vitest';
import { getEnv } from '../../src/config/env.js';

describe('Environment Validator', () => {
  it('parses valid environment configuration with defaults', () => {
    const custom = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test_db',
    };
    const config = getEnv(custom);
    expect(config.NODE_ENV).toBe('test');
    expect(config.LOG_LEVEL).toBe('info'); // default
    expect(config.DAILY_TOP_MATCHES_LIMIT).toBe(5); // default
  });

  it('fails when invalid URL is passed as DATABASE_URL', () => {
    const invalid = {
      DATABASE_URL: 'not-a-valid-url',
    };
    expect(() => getEnv(invalid)).toThrowError(/Environment validation failed/);
  });

  it('fails when invalid LOG_LEVEL is provided', () => {
    const invalid = {
      LOG_LEVEL: 'verbose_invalid',
    };
    expect(() => getEnv(invalid)).toThrowError(/Environment validation failed/);
  });

  it('coerces string numbers for DAILY_TOP_MATCHES_LIMIT', () => {
    const valid = {
      DAILY_TOP_MATCHES_LIMIT: '10',
    };
    const config = getEnv(valid);
    expect(config.DAILY_TOP_MATCHES_LIMIT).toBe(10);
  });
});
