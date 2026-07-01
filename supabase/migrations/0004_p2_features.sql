create table public.candidate_profile_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Family dashboard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidate_profiles
  add column if not exists profile_group_id uuid references public.candidate_profile_groups(id) on delete set null,
  add column if not exists display_name text,
  add column if not exists relationship text check (relationship in ('self', 'spouse', 'child', 'sibling', 'parent', 'other'));

alter table public.notification_preferences
  add column if not exists whatsapp_alerts boolean not null default false,
  add column if not exists preferred_locale text not null default 'en';

create table public.whatsapp_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  recipient text not null,
  template_name text not null,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  source_url text not null,
  source_pdf_path text,
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'approved', 'rejected')),
  extracted_json jsonb not null default '{}'::jsonb,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  human_verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_localizations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  locale text not null,
  title text,
  summary text,
  body_json jsonb not null default '{}'::jsonb,
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id, locale)
);

create table public.advanced_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade,
  report_type text not null,
  status text not null default 'generated',
  report_json jsonb not null,
  download_path text,
  created_at timestamptz not null default now()
);

alter table public.candidate_profile_groups enable row level security;
alter table public.whatsapp_delivery_logs enable row level security;
alter table public.extraction_jobs enable row level security;
alter table public.content_localizations enable row level security;
alter table public.advanced_reports enable row level security;

create policy "users own candidate profile groups" on public.candidate_profile_groups for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users read own advanced reports" on public.advanced_reports for select using (user_id = auth.uid());
create policy "admins read whatsapp logs" on public.whatsapp_delivery_logs for select using (public.is_admin());
create policy "admins manage extraction jobs" on public.extraction_jobs for all using (public.is_admin()) with check (public.is_admin());
create policy "public read reviewed localizations" on public.content_localizations for select using (reviewed = true);
create policy "admins manage localizations" on public.content_localizations for all using (public.is_admin()) with check (public.is_admin());
