-- Hindi (and later other language) versions of questions and of the data or passage a set of questions shares. The English text
-- is never overwritten. A translation is written by an AI, checked by code and by a second AI that solves it blind, and shown
-- to learners only once a person who reads Hindi has approved it.

create table public.question_translations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  lang text not null check (lang in ('hi')),
  stem text not null default '',
  options jsonb not null default '{}'::jsonb,
  explanation text not null default '',
  -- The question's drawn figure with its labels translated; the shape and numbers are unchanged.
  figure jsonb,
  status text not null default 'pending' check (status in ('pending', 'checking', 'needs_review', 'approved', 'rejected', 'failed')),
  attempts integer not null default 0,
  notes jsonb not null default '{}'::jsonb,
  model text,
  batch_id uuid references public.question_batches(id) on delete set null,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, lang)
);
create index question_translations_status_idx on public.question_translations (lang, status);
create index question_translations_batch_idx on public.question_translations (batch_id) where batch_id is not null;

create table public.set_translations (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.question_sets(id) on delete cascade,
  lang text not null check (lang in ('hi')),
  title text not null default '',
  stimulus text not null default '',
  chart jsonb,
  status text not null default 'pending' check (status in ('pending', 'checking', 'needs_review', 'approved', 'rejected', 'failed')),
  attempts integer not null default 0,
  notes jsonb not null default '{}'::jsonb,
  model text,
  batch_id uuid references public.question_batches(id) on delete set null,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, lang)
);
create index set_translations_status_idx on public.set_translations (lang, status);
