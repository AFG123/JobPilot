import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateProfile } from '../../src/profile/validator.js';
import { loadProfile } from '../../src/profile/loader.js';

describe('Profile Validator & Fact Registry', () => {
  const exampleProfileRaw = JSON.parse(
    readFileSync(resolve(process.cwd(), 'profile.example.json'), 'utf-8')
  );

  it('validates the synthetic profile.example.json successfully', () => {
    const result = validateProfile(exampleProfileRaw);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.allFactIds.size).toBeGreaterThan(0);
    expect(result.profile?.candidate.name).toContain('Candidate Zero');
  });

  it('rejects duplicate fact IDs across different categories', () => {
    const duplicateProfile = JSON.parse(JSON.stringify(exampleProfileRaw));
    duplicateProfile.verified_facts.experience[0].id = 'fact_skill_synth_backend';

    const result = validateProfile(duplicateProfile);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate Fact ID'))).toBe(true);
    expect(result.errors.some(e => e.includes('fact_skill_synth_backend'))).toBe(true);
  });

  it('rejects dangling references in evidence_fact_ids', () => {
    const danglingProfile = JSON.parse(JSON.stringify(exampleProfileRaw));
    danglingProfile.verified_facts.skills[0].evidence_fact_ids = ['fact_non_existent_exp'];

    const result = validateProfile(danglingProfile);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Dangling Reference'))).toBe(true);
    expect(result.errors.some(e => e.includes('fact_non_existent_exp'))).toBe(true);
  });

  it('rejects dangling references in achievement skill tags', () => {
    const danglingProfile = JSON.parse(JSON.stringify(exampleProfileRaw));
    danglingProfile.verified_facts.experience[0].achievements[0].skills = ['fact_skill_ghost'];

    const result = validateProfile(danglingProfile);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Dangling Reference'))).toBe(true);
    expect(result.errors.some(e => e.includes('fact_skill_ghost'))).toBe(true);
  });

  it('rejects profile where target base salary is less than minimum base salary', () => {
    const invalidCompProfile = JSON.parse(JSON.stringify(exampleProfileRaw));
    invalidCompProfile.preferences.compensation.min_base_salary = 200000;
    invalidCompProfile.preferences.compensation.target_base_salary = 150000;

    const result = validateProfile(invalidCompProfile);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('target_base_salary must be greater than or equal to min_base_salary'))).toBe(true);
  });
});

describe('Profile Loader & Safety Controls', () => {
  it('fails clearly when profile.json is missing in normal mode (no silent fallback)', () => {
    // Only test if profile.json does not exist locally (as expected in a clean repo)
    if (!existsSync(resolve(process.cwd(), 'profile.json'))) {
      expect(() => loadProfile()).toThrowError(/Production startup requires a verified 'profile.json'/);
      expect(() => loadProfile()).toThrowError(/use the explicit '--demo' flag/);
    }
  });

  it('loads synthetic profile when explicit demo mode is requested', () => {
    const loaded = loadProfile({ demo: true });
    expect(loaded.isDemo).toBe(true);
    expect(loaded.sourcePath).toContain('profile.example.json');
    expect(loaded.profile.candidate.name).toContain('Candidate Zero');
  });

  it('throws a descriptive error when a custom filePath does not exist', () => {
    expect(() => loadProfile({ filePath: './non_existent_file.json' })).toThrowError(/Profile file not found at:/);
  });
});
