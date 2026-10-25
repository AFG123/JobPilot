import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file into process.env if present
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/jobpilot_dev'),
  DAILY_TOP_MATCHES_LIMIT: z.coerce.number().int().positive().default(5),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig | null = null;

export function getEnv(customEnv?: Record<string, string | undefined>): EnvConfig {
  if (customEnv) {
    const result = envSchema.safeParse(customEnv);
    if (!result.success) {
      const formattedErrors = result.error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${formattedErrors}`);
    }
    return result.data;
  }

  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const formattedErrors = result.error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${formattedErrors}`);
    }
    parsedEnv = result.data;
  }

  return parsedEnv;
}

// Export for easy access
export const env = getEnv();
