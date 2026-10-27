-- Tests come in kinds (full-length, subject/sectional, topic) and levels (beginner, intermediate, advanced).
-- A missing level means the test is for all levels. Existing tests stay full-length.
alter table public.tests add column if not exists kind text not null default 'full' check (kind in ('full', 'sectional', 'topic'));
alter table public.tests add column if not exists level text check (level in ('beginner', 'intermediate', 'advanced'));
alter table public.tests add column if not exists subject text;
alter table public.tests add column if not exists topic text;
create index if not exists tests_series_group_idx on public.tests (series_id, status, kind, level, position);
create index if not exists test_questions_question_idx2 on public.test_questions (question_id);
