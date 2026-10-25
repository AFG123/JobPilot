import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Git Ignore Privacy Enforcement', () => {
  function checkIgnored(path: string): boolean {
    try {
      execSync(`git check-ignore "${path}"`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  it('ignores private environment and credential files', () => {
    expect(checkIgnored('.env')).toBe(true);
    expect(checkIgnored('.env.production')).toBe(true);
    expect(checkIgnored('credentials.json')).toBe(true);
    expect(checkIgnored('tokens/access.json')).toBe(true);
  });

  it('ignores real candidate profiles and resumes', () => {
    expect(checkIgnored('profile.json')).toBe(true);
    expect(checkIgnored('profile.local.json')).toBe(true);
    expect(checkIgnored('my_resume.pdf')).toBe(true);
    expect(checkIgnored('resumes/tailored.docx')).toBe(true);
  });

  it('allows the synthetic profile.example.json to be tracked in Git', () => {
    expect(checkIgnored('profile.example.json')).toBe(false);
  });
});
