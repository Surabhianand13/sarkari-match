-- Competitor leads: notifications spotted on other sites by the collector browser extension, collated into one review queue.
-- A lead is never public. An admin checks it against the official notification and approves it, which creates the real recruitment.

-- Tokens the browser extension signs in with. Only a hash is stored. A token can create pending leads and nothing else.
create table public.ingest_tokens (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null unique,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table public.notification_leads (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'published', 'drafted', 'rejected', 'duplicate')),
  lead_type text not null default 'recruitment' check (lead_type in ('recruitment', 'admit_card', 'result', 'answer_key', 'other')),
  -- false while the lead is only a headline spotted on a listing page; it cannot be approved until a detail page is analysed.
  detail_captured boolean not null default false,
  organisation_id uuid references public.organisations(id) on delete set null,
  organisation_name text,
  title text not null,
  notification_number text,
  state_name text,
  qualification_text text,
  notification_date date,
  application_start_date date,
  application_end_date date,
  vacancy_count integer,
  official_notification_url text,
  official_application_url text,
  official_website_url text,
  posts jsonb not null default '[]'::jsonb,
  -- An existing recruitment that looks like the same notification, so the reviewer does not publish it twice.
  matched_recruitment_id uuid references public.recruitments(id) on delete set null,
  -- The recruitment created when the lead was approved.
  recruitment_id uuid references public.recruitments(id) on delete set null,
  review_notes text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notification_leads_status_idx on public.notification_leads (status, created_at desc);
create index notification_leads_created_idx on public.notification_leads (created_at desc);

-- One row per page a lead was seen on, so two sites carrying the same notification collapse into one lead.
create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.notification_leads(id) on delete cascade,
  token_id uuid references public.ingest_tokens(id) on delete set null,
  site text not null,
  source_url text not null unique,
  page_title text,
  -- The page text as captured, for the reviewer only. Never shown to candidates.
  captured_text text,
  links jsonb not null default '[]'::jsonb,
  parsed jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);
create index lead_sources_lead_idx on public.lead_sources (lead_id);
