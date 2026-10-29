-- Question factory pipeline: the source material questions are written and checked against, a work queue for AI answers
-- (so a subscription chat can do the work instead of an API), and a live event log for the admin monitor.

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  exam_slug text not null,
  subject text,
  topic text,
  kind text not null check (kind in ('syllabus', 'current_affairs', 'pyq', 'reference')),
  title text not null,
  body text not null,
  file_name text,
  as_of date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index knowledge_sources_lookup_idx on public.knowledge_sources (exam_slug, kind, subject);

alter table public.questions
  add column pipeline_stage text,
  add column fix_attempts integer not null default 0,
  add column waiting_ai boolean not null default false,
  add column claimed_at timestamptz;
create index questions_pipeline_idx on public.questions (batch_id, pipeline_stage) where pipeline_stage is not null and pipeline_stage <> 'done';

alter table public.question_batches drop constraint if exists question_batches_status_check;
alter table public.question_batches
  add constraint question_batches_status_check check (status in ('pending', 'running', 'waiting_ai', 'completed', 'failed', 'cancelled')),
  add column write_calls integer not null default 0;

create table public.factory_tasks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.question_batches(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  stage text not null,
  task_key text not null,
  request jsonb not null,
  response text,
  answered_by text,
  status text not null default 'pending' check (status in ('pending', 'answered', 'applied')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (batch_id, task_key)
);
create index factory_tasks_pending_idx on public.factory_tasks (batch_id, stage) where status = 'pending';

create table public.factory_events (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.question_batches(id) on delete cascade,
  question_id uuid,
  stage text not null,
  outcome text not null check (outcome in ('passed', 'fixed', 'rejected', 'review', 'info', 'error')),
  message text not null,
  created_at timestamptz not null default now()
);
create index factory_events_batch_idx on public.factory_events (batch_id, id desc);
