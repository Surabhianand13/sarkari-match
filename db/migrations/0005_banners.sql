-- Homepage hero banners managed from the admin. Images live in the database (small, cached by the image route),
-- so no separate file storage is needed on Render.
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  link_url text,
  desktop_image bytea not null,
  desktop_type text not null,
  mobile_image bytea not null,
  mobile_type text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index banners_active_idx on public.banners (active, position);
