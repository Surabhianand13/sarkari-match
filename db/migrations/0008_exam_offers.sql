-- Per-exam offer: Exam Pass (the test series price and validity), optional AI Study Guide, second-exam discount, AI daily caps.
-- A missing row means defaults (12 month Pass, 20% second-exam discount, no Guide).
alter table public.exams add column if not exists pattern jsonb;

create table public.exam_offers (
  exam_id uuid primary key references public.exams(id) on delete cascade,
  pass_validity_days integer not null default 365 check (pass_validity_days > 0),
  second_exam_discount_percent integer not null default 20 check (second_exam_discount_percent between 0 and 90),
  guide_enabled boolean not null default false,
  guide_price_paise integer check (guide_price_paise is null or guide_price_paise >= 0),
  guide_mrp_paise integer check (guide_mrp_paise is null or guide_mrp_paise >= 0),
  guide_validity_days integer not null default 365 check (guide_validity_days > 0),
  ai_daily_fast_cap integer not null default 30 check (ai_daily_fast_cap >= 0),
  ai_daily_deep_cap integer not null default 2 check (ai_daily_deep_cap >= 0),
  updated_at timestamptz not null default now()
);

-- AI Study Guide access, one row per purchase, scoped to one exam. Only sold to learners who hold a Pass for that exam.
create table public.guide_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  source text not null check (source in ('purchase', 'grant', 'promo')),
  payment_ref text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index guide_access_payment_ref_idx on public.guide_access (payment_ref) where payment_ref is not null;
create index guide_access_user_idx on public.guide_access (user_id, exam_id);

-- Daily usage counters (also the cost record): turns and tokens per learner, exam, day and model tier.
create table public.ai_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  day date not null default current_date,
  tier text not null check (tier in ('fast', 'deep')),
  turns integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, exam_id, day, tier)
);

create table public.guide_messages (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  user_id uuid not null references public.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tier text check (tier in ('fast', 'deep')),
  created_at timestamptz not null default now()
);
create index guide_messages_thread_idx on public.guide_messages (user_id, exam_id, seq desc);
