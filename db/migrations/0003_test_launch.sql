-- Attempt deadlines and a guard against parallel in-progress attempts of the same test.
alter table public.test_attempts add column if not exists deadline_at timestamptz;
create unique index if not exists test_attempts_one_active_idx on public.test_attempts (user_id, test_id) where status = 'in_progress';
create index if not exists test_questions_test_idx on public.test_questions (test_id, position);
