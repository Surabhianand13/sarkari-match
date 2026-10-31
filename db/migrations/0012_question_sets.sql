-- Data sets: one table or chart shared by several questions (Data Interpretation). The data lives on the set, each question
-- keeps its own stem, options and solution, and a test shows the set's data above every question that belongs to it.

create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id),
  tier text,
  subject text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard')),
  title text not null,
  -- Introduction plus an optional text table (| rows), drawn on screen like any other question text.
  stimulus text not null default '',
  -- Optional bar, line or pie chart as numbers: { type, title, unit, categories, series: [{ name, values }] }.
  chart jsonb,
  source_type text not null default 'original_ai_generated' check (source_type in ('original_ai_generated', 'human_authored', 'imported')),
  batch_id uuid references public.question_batches(id) on delete set null,
  content_hash text not null unique,
  created_at timestamptz not null default now()
);
create index question_sets_lookup_idx on public.question_sets (exam_id, subject, topic);

alter table public.questions
  add column set_id uuid references public.question_sets(id) on delete set null,
  add column set_position smallint;
create index questions_set_idx on public.questions (set_id) where set_id is not null;
