alter table public.states enable row level security;
alter table public.departments enable row level security;
alter table public.qualification_levels enable row level security;
alter table public.organisations enable row level security;
alter table public.recruitments enable row level security;
alter table public.job_posts enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.user_qualifications enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.match_results enable row level security;
alter table public.plans enable row level security;
alter table public.entitlements enable row level security;
alter table public.payment_events enable row level security;
alter table public.founding_offer_reservations enable row level security;
alter table public.admin_roles enable row level security;
alter table public.audit_logs enable row level security;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid() and role = 'admin');
$$;

create policy "public can read taxonomies" on public.states for select using (true);
create policy "public can read departments" on public.departments for select using (true);
create policy "public can read qualification levels" on public.qualification_levels for select using (true);
create policy "public can read active organisations" on public.organisations for select using (active = true);
create policy "public can read published recruitments" on public.recruitments for select using (editorial_status = 'published');
create policy "public can read active posts" on public.job_posts for select using (active = true and published_at is not null);
create policy "public can read plans" on public.plans for select using (active = true);

create policy "users own candidate profiles" on public.candidate_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users own qualifications" on public.user_qualifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users own saved jobs" on public.saved_jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users own match results" on public.match_results for select using (user_id = auth.uid());
create policy "users own entitlements" on public.entitlements for select using (user_id = auth.uid());
create policy "users own reservations" on public.founding_offer_reservations for select using (user_id = auth.uid());

create policy "admins manage organisations" on public.organisations for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage recruitments" on public.recruitments for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage posts" on public.job_posts for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit logs" on public.audit_logs for select using (public.is_admin());

create or replace function public.reserve_founding_pass(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_id uuid;
  used_count integer;
begin
  update public.founding_offer_reservations
  set status = 'expired'
  where status = 'active' and expires_at < now();

  select count(*) into used_count
  from public.founding_offer_reservations
  where status in ('active', 'converted');

  if used_count >= 1000 then
    raise exception 'founding_pass_sold_out';
  end if;

  insert into public.founding_offer_reservations (user_id, expires_at, status)
  values (p_user_id, now() + interval '15 minutes', 'active')
  returning id into reservation_id;

  return reservation_id;
end;
$$;
