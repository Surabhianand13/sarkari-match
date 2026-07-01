export type Category = "general" | "ews" | "obc" | "sc" | "st" | "other";

export type CandidateQualification = {
  level: string;
  degree?: string;
  specialisation?: string;
  passingYear?: number;
  finalYear?: boolean;
};

export type CandidateProfile = {
  dateOfBirth?: string;
  category: Category;
  domicileState?: string;
  languages?: string[];
  qualifications: CandidateQualification[];
  experienceMonthsByDomain?: Record<string, number>;
};

export type AgeRule = {
  category?: Category;
  minimumAge?: number;
  maximumAge: number;
  cutoffDate: string;
  relaxationYears?: number;
  stackable?: boolean;
  ruleText: string;
};

export type QualificationRule = {
  minimumLevel: string;
  degree?: string;
  specialisation?: string;
  acceptedAnyDegree?: boolean;
  equivalentAllowed?: boolean;
  finalYearAllowed?: boolean;
  mandatory: boolean;
  ruleText: string;
};

export type ExperienceRule = {
  domain: string;
  minimumMonths: number;
  mandatory: boolean;
  ruleText: string;
};

export type OtherRule = {
  type: "domicile" | "language";
  value: string;
  mandatory: boolean;
  ruleText: string;
};

export type PostRules = {
  ageRules: AgeRule[];
  qualificationRules: QualificationRule[];
  experienceRules: ExperienceRule[];
  otherRules: OtherRule[];
};

export type MatchStatus = "strong_match" | "possible_match" | "needs_information" | "not_eligible";

export type MatchResult = {
  status: MatchStatus;
  score: number;
  matched_rules: string[];
  warnings: string[];
  missing_information: string[];
  failed_rules: string[];
};
