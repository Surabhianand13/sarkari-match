-- Figures for questions. Two kinds, both reviewed by a person before anything is published:
--   figure: a Venn or geometry diagram stored as a structured description (never as a picture), drawn by the site.
--   image:  a picture a person uploaded for a question. Like banners, it lives in the database, so no file storage is needed.

create table public.question_images (
  id uuid primary key default gen_random_uuid(),
  data bytea not null,
  content_type text not null,
  -- What the picture shows, in words: read aloud by screen readers and shown to the checking AI, which cannot see the picture.
  alt text not null,
  created_at timestamptz not null default now()
);

alter table public.questions
  add column figure jsonb,
  add column image_id uuid references public.question_images(id) on delete set null;
create index questions_image_idx on public.questions (image_id) where image_id is not null;
