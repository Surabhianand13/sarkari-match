alter table public.job_posts
  add column if not exists eligibility_rules jsonb not null default '{}'::jsonb;

comment on column public.job_posts.eligibility_rules is
  'Deterministic PostRules JSON (ageRules, qualificationRules, experienceRules, otherRules) consumed by lib/matching/engine.ts evaluateMatch().';
