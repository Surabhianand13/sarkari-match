-- Questions about events (current affairs) record the month their facts are from and the source note they were written from. The
-- month is shown to learners with the question, so a reader can see how recent it is. Nothing expires: old questions stay usable.

alter table public.questions
  add column fact_as_of date,
  add column source_title text;
