import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { loadProfile } from './profile/loader.js';

const isDemo = process.argv.includes('--demo');

logger.info('Initializing JobPilot CLI runtime (Step 1 scaffold)...', {
  node_env: env.NODE_ENV,
  log_level: env.LOG_LEVEL,
  is_demo: isDemo,
});

try {
  const { profile, isDemo: demoActive } = loadProfile({ demo: isDemo });

  if (demoActive) {
    logger.warn('*** RUNNING IN DEMO MODE (SYNTHETIC PROFILE DATA) ***');
  }

  logger.info('Candidate profile loaded and validated', {
    is_demo: demoActive,
    profile_version: profile.version,
    verified_skills_count: profile.verified_facts.skills.length,
    verified_experience_count: profile.verified_facts.experience.length,
    target_roles_count: profile.preferences.target_roles.length,
  });
} catch (err) {
  logger.error('Failed to load profile', undefined, err as Error);
  process.exit(1);
}
