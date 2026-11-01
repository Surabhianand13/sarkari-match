-- A set can now hold a reading passage (comprehension) or a passage with numbered blanks (cloze test), not only a table or chart.
alter table public.question_sets
  add column kind text not null default 'data' check (kind in ('data', 'passage', 'cloze'));
