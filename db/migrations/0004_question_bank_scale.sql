-- Question bank at lakhs of rows: admin queue ordering, bank filtering for test assembly,
-- and reverse lookups (which tests use a question).
create index if not exists questions_queue_idx on public.questions (validation_status, created_at desc);
create index if not exists questions_bank_idx on public.questions (exam_id, subject, topic, difficulty) where validation_status = 'published';
create index if not exists questions_batch_idx on public.questions (batch_id) where batch_id is not null;
create index if not exists test_questions_question_idx on public.test_questions (question_id);
