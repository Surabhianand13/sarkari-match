-- Sample/development notifications only. Replace with verified official data before production launch.

with org as (
  insert into public.organisations (name, slug, organisation_type, department_id, state_id, official_website, active)
  values (
    'Demo Staff Selection Board', 'demo-ssc-board', 'central_board',
    (select id from public.departments where slug = 'ssc'),
    (select id from public.states where slug = 'central-government'),
    'https://example.com', true
  )
  on conflict (slug) do update set name = excluded.name
  returning id
), recruitment as (
  insert into public.recruitments (
    organisation_id, title, slug, notification_number, application_end_date,
    official_notification_url, official_application_url, status, editorial_status, verified_at, published_at
  )
  values (
    (select id from org),
    'Demo SSC Combined Recruitment 2026', 'demo-ssc-assistant-2026', 'SSC/2026/001', '2026-08-15',
    'https://example.com/notification.pdf', 'https://example.com/apply', 'published', 'published', now(), now()
  )
  on conflict (slug) do update set title = excluded.title
  returning id
)
insert into public.job_posts (
  recruitment_id, title, slug, description, vacancy_count, salary_text, application_status, active, published_at, eligibility_rules
)
values (
  (select id from recruitment),
  'Demo SSC Assistant Officer 2026', 'demo-ssc-assistant-2026',
  'Sample listing for validating SarkariMatch workflows. Replace with verified official data before production launch.',
  120, 'Level 6, as per official notification', 'open', true, now(),
  '{
    "ageRules": [{"category": "general", "minimumAge": 18, "maximumAge": 27, "cutoffDate": "2026-08-01", "relaxationYears": 5, "stackable": true, "ruleText": "Age must be 18-27 years as on 01-08-2026 for General category (relaxation applies for reserved categories)."}],
    "qualificationRules": [{"minimumLevel": "graduate", "mandatory": true, "acceptedAnyDegree": true, "ruleText": "Bachelor''s degree from a recognised university."}],
    "experienceRules": [],
    "otherRules": []
  }'::jsonb
)
on conflict (slug) do update set eligibility_rules = excluded.eligibility_rules, active = true, published_at = now();

with org as (
  insert into public.organisations (name, slug, organisation_type, department_id, state_id, official_website, active)
  values (
    'Demo Railway Recruitment Cell', 'demo-railway-cell', 'state_board',
    (select id from public.departments where slug = 'railways'),
    (select id from public.states where slug = 'karnataka'),
    'https://example.com', true
  )
  on conflict (slug) do update set name = excluded.name
  returning id
), recruitment as (
  insert into public.recruitments (
    organisation_id, title, slug, notification_number, application_end_date,
    official_notification_url, official_application_url, status, editorial_status, verified_at, published_at
  )
  values (
    (select id from org),
    'Demo Railway Technical Posts 2026', 'demo-railway-technician-2026', 'RRC/2026/014', '2026-07-20',
    'https://example.com/railway-notification.pdf', 'https://example.com/railway-apply', 'published', 'published', now(), now()
  )
  on conflict (slug) do update set title = excluded.title
  returning id
)
insert into public.job_posts (
  recruitment_id, title, slug, description, vacancy_count, salary_text, application_status, active, published_at, eligibility_rules
)
values (
  (select id from recruitment),
  'Demo Railway Technician 2026', 'demo-railway-technician-2026',
  'Sample listing for validating filters, expiry behavior and detail pages.',
  80, 'Pay matrix level 2', 'open', true, now(),
  '{
    "ageRules": [{"category": "general", "minimumAge": 18, "maximumAge": 24, "cutoffDate": "2026-07-01", "relaxationYears": 5, "stackable": true, "ruleText": "Age must be 18-24 years as on 01-07-2026 for General category (relaxation applies for reserved categories)."}],
    "qualificationRules": [{"minimumLevel": "iti", "mandatory": true, "acceptedAnyDegree": true, "ruleText": "ITI certificate in a relevant trade."}],
    "experienceRules": [],
    "otherRules": []
  }'::jsonb
)
on conflict (slug) do update set eligibility_rules = excluded.eligibility_rules, active = true, published_at = now();

with org as (
  insert into public.organisations (name, slug, organisation_type, department_id, state_id, official_website, active)
  values (
    'Demo UPSC Commission', 'demo-upsc', 'central_board',
    (select id from public.departments where slug = 'upsc'),
    (select id from public.states where slug = 'central-government'),
    'https://example.com', true
  )
  on conflict (slug) do update set name = excluded.name
  returning id
), recruitment as (
  insert into public.recruitments (
    organisation_id, title, slug, notification_number, application_end_date,
    official_notification_url, official_application_url, status, editorial_status, verified_at, published_at
  )
  values (
    (select id from org),
    'Demo UPSC Civil Services 2026', 'demo-upsc-civil-services-2026', 'UPSC/2026/CSE', '2026-09-10',
    'https://example.com/upsc-notification.pdf', 'https://example.com/upsc-apply', 'published', 'published', now(), now()
  )
  on conflict (slug) do update set title = excluded.title
  returning id
)
insert into public.job_posts (
  recruitment_id, title, slug, description, vacancy_count, salary_text, application_status, active, published_at, eligibility_rules
)
values (
  (select id from recruitment),
  'Demo UPSC Civil Services 2026', 'demo-upsc-civil-services-2026',
  'Sample listing with a stricter age and qualification rule set, for testing not-eligible and needs-information match outcomes.',
  180, 'Level 10, as per official notification', 'open', true, now(),
  '{
    "ageRules": [{"category": "general", "minimumAge": 21, "maximumAge": 32, "cutoffDate": "2026-08-01", "relaxationYears": 5, "stackable": true, "ruleText": "Age must be 21-32 years as on 01-08-2026 for General category (relaxation applies for reserved categories)."}],
    "qualificationRules": [{"minimumLevel": "graduate", "mandatory": true, "acceptedAnyDegree": true, "ruleText": "Bachelor''s degree from a recognised university."}],
    "experienceRules": [],
    "otherRules": []
  }'::jsonb
)
on conflict (slug) do update set eligibility_rules = excluded.eligibility_rules, active = true, published_at = now();
