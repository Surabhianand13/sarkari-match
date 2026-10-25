-- Baseline schema for Sarkari Match by PW on plain PostgreSQL (Render).
-- Authorization is enforced in application code; there is no row level security.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text,
  password_hash text,
  full_name text,
  roles text[] not null default '{}',
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_lower_idx on public.users (lower(email));

create table public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index auth_otps_email_idx on public.auth_otps (lower(email), created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null default 0
);

-- from supabase/migrations/0001_initial_schema.sql

create type public.match_status as enum ('strong_match', 'possible_match', 'needs_information', 'not_eligible');
create type public.application_status as enum ('open', 'closed', 'upcoming');
create type public.editorial_status as enum ('draft', 'needs_review', 'reviewed', 'published', 'expired', 'archived');

create table public.states (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qualification_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  rank integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_name text,
  organisation_type text,
  department_id uuid references public.departments(id),
  state_id uuid references public.states(id),
  official_website text,
  logo_url text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruitments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  title text not null,
  slug text not null unique,
  notification_number text,
  notification_date date,
  application_start_date date,
  application_end_date date,
  official_notification_url text,
  official_application_url text,
  official_website_url text,
  status text not null default 'draft',
  editorial_status public.editorial_status not null default 'draft',
  summary text,
  verification_notes text,
  verified_at timestamptz,
  verified_by uuid,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  recruitment_id uuid not null references public.recruitments(id) on delete cascade,
  title text not null,
  slug text not null unique,
  post_code text,
  description text,
  vacancy_count integer,
  employment_type text,
  government_level text,
  salary_min integer,
  salary_max integer,
  salary_text text,
  pay_level text,
  currency text not null default 'INR',
  location_text text,
  remote_allowed boolean not null default false,
  application_status public.application_status not null default 'upcoming',
  active boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location_text, ''))) stored
);

create index job_posts_search_idx on public.job_posts using gin(search_vector);
create index job_posts_published_idx on public.job_posts(active, published_at);
create index recruitments_application_end_idx on public.recruitments(application_end_date);

create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text,
  phone text,
  date_of_birth date,
  category text,
  gender text,
  pwbd_status boolean not null default false,
  ex_serviceman_status boolean not null default false,
  nationality text,
  domicile_state_id uuid references public.states(id),
  profile_completion integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_qualifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade,
  qualification_level_id uuid references public.qualification_levels(id),
  degree text,
  specialisation text,
  institution_name text,
  passing_year integer,
  completion_status text,
  percentage numeric,
  cgpa numeric,
  final_year boolean not null default false,
  registration_name text,
  registration_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.job_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade,
  post_id uuid not null references public.job_posts(id) on delete cascade,
  status public.match_status not null,
  score integer not null,
  explanation_json jsonb not null,
  rules_version text not null,
  calculated_at timestamptz not null default now()
);

create table public.plans (
  code text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  starts_at timestamptz not null,
  ends_at timestamptz,
  source text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.founding_offer_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'converted', 'expired', 'cancelled')),
  payment_order_id text,
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

-- from supabase/migrations/0002_rls_and_functions.sql

create or replace function public.reserve_founding_pass(p_user_id uuid)
returns uuid
language plpgsql
as $$
declare
  reservation_id uuid;
  used_count integer;
begin
  update public.founding_offer_reservations
  set status = 'expired'
  where status = 'active' and expires_at < now();

  select count(*) into used_count
  from public.founding_offer_reservations
  where status in ('active', 'converted');

  if used_count >= 1000 then
    raise exception 'founding_pass_sold_out';
  end if;

  insert into public.founding_offer_reservations (user_id, expires_at, status)
  values (p_user_id, now() + interval '15 minutes', 'active')
  returning id into reservation_id;

  return reservation_id;
end;
$$;

-- from supabase/migrations/0003_p1_features.sql
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.job_posts(id) on delete cascade,
  status text not null check (status in (
    'interested',
    'saved',
    'application_started',
    'applied',
    'fee_paid',
    'admit_card_released',
    'exam_completed',
    'result_awaited',
    'selected',
    'not_selected',
    'withdrawn'
  )),
  application_number text,
  applied_at date,
  notes text,
  next_action_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, post_id)
);

create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  email_digest_frequency text not null default 'weekly',
  closing_soon_reminders boolean not null default true,
  saved_job_change_alerts boolean not null default true,
  subscription_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  template text not null,
  recipient text not null,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid references public.users(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete cascade,
  code text references public.referral_codes(code),
  event_type text not null check (event_type in ('link_created', 'link_clicked', 'signup_attributed', 'first_payment_completed', 'reward_granted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  post_id uuid references public.job_posts(id) on delete cascade,
  issue_type text not null,
  details text not null,
  status text not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  provider text not null default 'razorpay',
  provider_subscription_id text unique,
  status text not null,
  starts_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  provider text not null default 'razorpay',
  provider_order_id text unique,
  amount_paise integer not null,
  currency text not null default 'INR',
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.users(id) on delete set null,
  filename text not null,
  status text not null default 'validated',
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  errors_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- from supabase/migrations/0004_p2_features.sql
create table public.candidate_profile_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'Family dashboard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidate_profiles
  add column if not exists profile_group_id uuid references public.candidate_profile_groups(id) on delete set null,
  add column if not exists display_name text,
  add column if not exists relationship text check (relationship in ('self', 'spouse', 'child', 'sibling', 'parent', 'other'));

alter table public.notification_preferences
  add column if not exists whatsapp_alerts boolean not null default false,
  add column if not exists preferred_locale text not null default 'en';

create table public.whatsapp_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  recipient text not null,
  template_name text not null,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users(id) on delete set null,
  source_url text not null,
  source_pdf_path text,
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'approved', 'rejected')),
  extracted_json jsonb not null default '{}'::jsonb,
  reviewer_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  human_verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_localizations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  locale text not null,
  title text,
  summary text,
  body_json jsonb not null default '{}'::jsonb,
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id, locale)
);

create table public.advanced_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade,
  report_type text not null,
  status text not null default 'generated',
  report_json jsonb not null,
  download_path text,
  created_at timestamptz not null default now()
);

-- from supabase/migrations/0005_post_eligibility_rules.sql
alter table public.job_posts
  add column if not exists eligibility_rules jsonb not null default '{}'::jsonb;

comment on column public.job_posts.eligibility_rules is
  'Deterministic PostRules JSON (ageRules, qualificationRules, experienceRules, otherRules) consumed by lib/matching/engine.ts evaluateMatch().';
