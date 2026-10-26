-- Adaptive practice: short untimed sessions from the question bank with instant feedback.
-- A learner has one level per subject; scoring 70% or more in three sessions in a row promotes them.
create table public.practice_levels (
  user_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  good_sessions integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject)
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  topic text,
  level text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  total integer not null default 0,
  correct integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index practice_sessions_user_idx on public.practice_sessions (user_id, created_at desc);

create table public.practice_answers (
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  position integer not null,
  selected_option text check (selected_option in ('A', 'B', 'C', 'D')),
  is_correct boolean,
  answered_at timestamptz,
  primary key (session_id, question_id)
);
