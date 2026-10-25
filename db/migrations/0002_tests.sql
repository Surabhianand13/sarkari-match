-- Mock test platform: exams, test series, tests, question bank, attempts and access.

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.test_series (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id),
  slug text not null unique,
  title text not null,
  description text,
  price_paise integer not null default 0 check (price_paise >= 0),
  mrp_paise integer check (mrp_paise is null or mrp_paise >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index test_series_exam_idx on public.test_series (exam_id, status);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.test_series(id) on delete cascade,
  slug text not null,
  title text not null,
  instructions text,
  duration_minutes integer not null check (duration_minutes > 0),
  default_marks numeric not null default 2,
  negative_marks numeric not null default 0.5 check (negative_marks >= 0),
  is_free_sample boolean not null default false,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, slug)
);

create table public.test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  name text not null,
  position integer not null default 0
);

create table public.question_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users(id) on delete set null,
  exam_slug text,
  subject text not null,
  topic text,
  difficulty text,
  requested_count integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  generated_count integer not null default 0,
  passed_count integer not null default 0,
  rejected_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id),
  tier text,
  subject text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard')),
  stem text not null,
  options jsonb not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text not null,
  est_time_seconds integer not null default 60 check (est_time_seconds > 0),
  source_type text not null default 'original_ai_generated' check (source_type in ('original_ai_generated', 'human_authored', 'imported')),
  validation_status text not null default 'pending' check (validation_status in ('pending', 'auto_failed', 'auto_passed', 'needs_review', 'approved', 'rejected', 'published')),
  validation_notes jsonb not null default '{}'::jsonb,
  generator_model text,
  critic_model text,
  prompt_version text,
  batch_id uuid references public.question_batches(id) on delete set null,
  content_hash text not null unique,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_status_idx on public.questions (validation_status, subject, topic);

create table public.test_questions (
  test_id uuid not null references public.tests(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  section_id uuid references public.test_sections(id) on delete set null,
  position integer not null default 0,
  marks numeric,
  primary key (test_id, question_id)
);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  correct_count integer,
  incorrect_count integer,
  unattempted_count integer,
  time_spent_seconds integer,
  result_json jsonb
);
create index test_attempts_user_idx on public.test_attempts (user_id, test_id);

create table public.attempt_answers (
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option text check (selected_option in ('A', 'B', 'C', 'D')),
  marked_for_review boolean not null default false,
  time_spent_seconds integer not null default 0,
  primary key (attempt_id, question_id)
);

create table public.test_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  series_id uuid not null references public.test_series(id) on delete cascade,
  source text not null check (source in ('purchase', 'grant', 'promo')),
  payment_ref text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index test_access_payment_ref_idx on public.test_access (payment_ref) where payment_ref is not null;
create index test_access_user_idx on public.test_access (user_id, series_id);
