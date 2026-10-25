export interface CandidateContact {
  name: string;
  email: string;
  phone?: string;
  location: string;
  timezone: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
}

export interface SkillFact {
  id: string; // must start with "fact_skill_"
  name: string;
  category: string;
  years_experience: number;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  evidence_fact_ids?: string[];
}

export interface AchievementFact {
  id: string; // must start with "fact_exp_" or "fact_bullet_"
  text: string;
  skills?: string[]; // fact IDs
}

export interface ExperienceFact {
  id: string; // must start with "fact_exp_"
  company: string;
  title: string;
  start_date: string; // YYYY-MM
  end_date?: string; // YYYY-MM or null/omitted for current
  location: string;
  achievements: AchievementFact[];
}

export interface ProjectFact {
  id: string; // must start with "fact_proj_"
  name: string;
  role: string;
  description: string;
  skills?: string[]; // fact IDs
  url?: string;
}

export interface EducationFact {
  id: string; // must start with "fact_edu_"
  institution: string;
  degree: string;
  start_year: number;
  graduation_year?: number;
}

export interface CertificationFact {
  id: string; // must start with "fact_cert_"
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_url?: string;
}

export interface VerifiedFacts {
  skills: SkillFact[];
  experience: ExperienceFact[];
  projects: ProjectFact[];
  education: EducationFact[];
  certifications?: CertificationFact[];
}

export interface TargetRolePreference {
  title: string;
  weight: number; // 0.0 to 1.0
}

export interface LocationPreference {
  remote_only: boolean;
  allowed_countries: string[];
  preferred_timezones?: string[];
  allowed_cities?: string[];
}

export interface CompensationPreference {
  currency: string;
  min_base_salary: number;
  target_base_salary: number;
}

export interface CompanyPreference {
  min_company_size?: number;
  max_company_size?: number;
  excluded_industries?: string[];
  favored_industries?: string[];
}

export interface WorkAuthorizationPreference {
  citizen_of: string[];
  requires_sponsorship: boolean;
}

export interface ProfilePreferences {
  target_roles: TargetRolePreference[];
  disallowed_roles?: string[];
  locations: LocationPreference;
  compensation: CompensationPreference;
  company_preferences?: CompanyPreference;
  work_authorization: WorkAuthorizationPreference;
}

export interface CandidateProfile {
  version: string;
  candidate: CandidateContact;
  verified_facts: VerifiedFacts;
  preferences: ProfilePreferences;
}
