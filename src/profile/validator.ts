import { z } from 'zod';
import type { CandidateProfile } from './types.js';

// Regex for stable fact IDs: starts with fact_
const factIdRegex = /^fact_[a-z0-9_]+$/;

const candidateSchema = z.object({
  name: z.string().min(1, 'Candidate name is required'),
  email: z.string().email('Invalid candidate email'),
  phone: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  linkedin_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  portfolio_url: z.string().url().optional(),
});

const skillFactSchema = z.object({
  id: z.string().regex(factIdRegex, 'Skill fact ID must match format fact_*'),
  name: z.string().min(1),
  category: z.string().min(1),
  years_experience: z.number().nonnegative(),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  evidence_fact_ids: z.array(z.string().regex(factIdRegex)).optional(),
});

const achievementFactSchema = z.object({
  id: z.string().regex(factIdRegex, 'Achievement fact ID must match format fact_*'),
  text: z.string().min(1),
  skills: z.array(z.string().regex(factIdRegex)).optional(),
});

const experienceFactSchema = z.object({
  id: z.string().regex(factIdRegex, 'Experience fact ID must match format fact_*'),
  company: z.string().min(1),
  title: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be in format YYYY-MM'),
  end_date: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be in format YYYY-MM').optional(),
  location: z.string().min(1),
  achievements: z.array(achievementFactSchema).default([]),
});

const projectFactSchema = z.object({
  id: z.string().regex(factIdRegex, 'Project fact ID must match format fact_*'),
  name: z.string().min(1),
  role: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string().regex(factIdRegex)).optional(),
  url: z.string().url().optional(),
});

const educationFactSchema = z.object({
  id: z.string().regex(factIdRegex, 'Education fact ID must match format fact_*'),
  institution: z.string().min(1),
  degree: z.string().min(1),
  start_year: z.number().int().min(1900),
  graduation_year: z.number().int().min(1900).optional(),
});

const certificationFactSchema = z.object({
  id: z.string().regex(factIdRegex, 'Certification fact ID must match format fact_*'),
  name: z.string().min(1),
  issuer: z.string().min(1),
  issue_date: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be in format YYYY-MM'),
  expiry_date: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be in format YYYY-MM').optional(),
  credential_url: z.string().url().optional(),
});

const verifiedFactsSchema = z.object({
  skills: z.array(skillFactSchema),
  experience: z.array(experienceFactSchema),
  projects: z.array(projectFactSchema),
  education: z.array(educationFactSchema),
  certifications: z.array(certificationFactSchema).optional().default([]),
});

const preferencesSchema = z.object({
  target_roles: z.array(
    z.object({
      title: z.string().min(1),
      weight: z.number().min(0).max(1),
    })
  ).min(1, 'At least one target role is required'),
  disallowed_roles: z.array(z.string()).optional().default([]),
  locations: z.object({
    remote_only: z.boolean(),
    allowed_countries: z.array(z.string()).min(1),
    preferred_timezones: z.array(z.string()).optional(),
    allowed_cities: z.array(z.string()).optional(),
  }),
  compensation: z.object({
    currency: z.string().length(3),
    min_base_salary: z.number().positive(),
    target_base_salary: z.number().positive(),
  }).refine(data => data.target_base_salary >= data.min_base_salary, {
    message: 'target_base_salary must be greater than or equal to min_base_salary',
    path: ['target_base_salary'],
  }),
  company_preferences: z.object({
    min_company_size: z.number().int().positive().optional(),
    max_company_size: z.number().int().positive().optional(),
    excluded_industries: z.array(z.string()).optional().default([]),
    favored_industries: z.array(z.string()).optional().default([]),
  }).optional(),
  work_authorization: z.object({
    citizen_of: z.array(z.string()).min(1),
    requires_sponsorship: z.boolean(),
  }),
});

export const profileSchema = z.object({
  version: z.string().min(1),
  candidate: candidateSchema,
  verified_facts: verifiedFactsSchema,
  preferences: preferencesSchema,
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  allFactIds: Set<string>;
  profile?: CandidateProfile | undefined;
}

/**
 * Validates profile schema, fact ID uniqueness, and reference integrity.
 */
export function validateProfile(rawProfile: unknown): ValidationResult {
  const errors: string[] = [];

  const parseResult = profileSchema.safeParse(rawProfile);
  if (!parseResult.success) {
    for (const err of parseResult.error.errors) {
      errors.push(`[Schema Error] ${err.path.join('.')}: ${err.message}`);
    }
    return { valid: false, errors, allFactIds: new Set() };
  }

  const profile = parseResult.data as CandidateProfile;
  const allFactIds = new Set<string>();

  // Helper to record and detect duplicate fact IDs
  const registerFactId = (id: string, context: string): void => {
    if (allFactIds.has(id)) {
      errors.push(`[Duplicate Fact ID] '${id}' is defined more than once (found in ${context}).`);
    } else {
      allFactIds.add(id);
    }
  };

  // 1. Collect all declared fact IDs
  for (const s of profile.verified_facts.skills) {
    registerFactId(s.id, `skills: ${s.name}`);
  }
  for (const exp of profile.verified_facts.experience) {
    registerFactId(exp.id, `experience: ${exp.company}`);
    for (const ach of exp.achievements) {
      registerFactId(ach.id, `achievement in ${exp.company}`);
    }
  }
  for (const proj of profile.verified_facts.projects) {
    registerFactId(proj.id, `project: ${proj.name}`);
  }
  for (const edu of profile.verified_facts.education) {
    registerFactId(edu.id, `education: ${edu.institution}`);
  }
  if (profile.verified_facts.certifications) {
    for (const cert of profile.verified_facts.certifications) {
      registerFactId(cert.id, `certification: ${cert.name}`);
    }
  }

  // 2. Validate reference integrity (dangling IDs)
  // Check skills evidence_fact_ids
  for (const s of profile.verified_facts.skills) {
    if (s.evidence_fact_ids) {
      for (const refId of s.evidence_fact_ids) {
        if (!allFactIds.has(refId)) {
          errors.push(
            `[Dangling Reference] Skill '${s.name}' (${s.id}) references non-existent fact ID '${refId}' in evidence_fact_ids.`
          );
        }
      }
    }
  }

  // Check achievement skills
  for (const exp of profile.verified_facts.experience) {
    for (const ach of exp.achievements) {
      if (ach.skills) {
        for (const refId of ach.skills) {
          if (!allFactIds.has(refId)) {
            errors.push(
              `[Dangling Reference] Achievement '${ach.id}' in '${exp.company}' references non-existent skill fact ID '${refId}'.`
            );
          }
        }
      }
    }
  }

  // Check project skills
  for (const proj of profile.verified_facts.projects) {
    if (proj.skills) {
      for (const refId of proj.skills) {
        if (!allFactIds.has(refId)) {
          errors.push(
            `[Dangling Reference] Project '${proj.name}' (${proj.id}) references non-existent skill fact ID '${refId}'.`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    allFactIds,
    profile: errors.length === 0 ? profile : undefined,
  };
}
