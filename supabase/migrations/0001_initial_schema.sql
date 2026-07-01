create extension if not exists pgcrypto;

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
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.job_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'converted', 'expired', 'cancelled')),
  payment_order_id text,
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'reviewer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
