-- Questions whose answer can go out of date (current affairs, office holders, rankings). A question records the source note it was
-- written from, the date its facts were true, and the date it should be re-checked. After that date it is kept out of new tests
-- and practice and listed for review. A question with no valid_until never expires.

alter table public.questions
  add column fact_as_of date,
  add column valid_until date,
  add column source_title text;
create index questions_valid_until_idx on public.questions (valid_until) where valid_until is not null;
