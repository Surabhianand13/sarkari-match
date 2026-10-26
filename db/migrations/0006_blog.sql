-- Blog articles managed from the admin. Content is a small Markdown subset rendered safely on the server.
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  tags text[] not null default '{}',
  author text not null default 'Sarkari Match Editorial',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_posts_published_idx on public.blog_posts (status, published_at desc);
