-- One-click sync: the date a listing page showed for a notification (so a newer date means it was updated), and what changed on a
-- notification's source page since it was last read, kept on the lead until someone has looked at it.
alter table public.lead_sources add column if not exists listing_date date;
alter table public.notification_leads add column if not exists source_updates jsonb not null default '[]'::jsonb;
alter table public.notification_leads add column if not exists updates_seen_at timestamptz;
