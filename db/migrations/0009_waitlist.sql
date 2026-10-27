-- "Notify me" list for exams whose test series are not live yet.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  exam text not null default 'ssc-cgl',
  source text,
  created_at timestamptz not null default now(),
  unique (email, exam)
);
