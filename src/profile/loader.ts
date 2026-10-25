import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CandidateProfile } from './types.js';
import { validateProfile } from './validator.js';

export interface LoadProfileOptions {
  filePath?: string | undefined;
  demo?: boolean | undefined;
}

export interface LoadedProfile {
  profile: CandidateProfile;
  isDemo: boolean;
  sourcePath: string;
}

/**
 * Loads and validates candidate profile JSON from local disk.
 *
 * Safety rules enforced:
 * 1. Production startup MUST fail clearly if 'profile.json' is missing.
 * 2. Silent fallback to synthetic candidate data is strictly prohibited.
 * 3. Demo mode requires an explicit options.demo = true flag.
 */
export function loadProfile(options: LoadProfileOptions = {}): LoadedProfile {
  const defaultProdPath = resolve(process.cwd(), 'profile.json');
  const examplePath = resolve(process.cwd(), 'profile.example.json');

  const isDemo = Boolean(options.demo);
  const targetPath = options.filePath
    ? resolve(options.filePath)
    : (isDemo ? examplePath : defaultProdPath);

  if (!existsSync(targetPath)) {
    if (isDemo) {
      throw new Error(
        `Demo profile file not found at: ${targetPath}. ` +
        `Ensure 'profile.example.json' exists in project root.`
      );
    }
    throw new Error(
      `Profile file not found at: ${targetPath}.\n` +
      `Production startup requires a verified 'profile.json' in the project root.\n` +
      `To run in demo mode with synthetic data, use the explicit '--demo' flag.`
    );
  }

  let rawContent: string;
  try {
    rawContent = readFileSync(targetPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read profile file at ${targetPath}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Profile file contains invalid JSON at ${targetPath}: ${(err as Error).message}`);
  }

  const result = validateProfile(parsed);
  if (!result.valid || !result.profile) {
    throw new Error(
      `Profile validation failed for ${targetPath}:\n` +
      result.errors.map(e => `  - ${e}`).join('\n')
    );
  }

  return {
    profile: result.profile,
    isDemo,
    sourcePath: targetPath,
  };
}
