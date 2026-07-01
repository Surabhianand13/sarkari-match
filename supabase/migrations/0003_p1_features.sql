create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.job_posts(id) on delete cascade,
  status text not null check (status in (
    'interested',
    'saved',
    'application_started',
    'applied',
    'fee_paid',
    'admit_card_released',
    'exam_completed',
    'result_awaited',
    'selected',
    'not_selected',
    'withdrawn'
  )),
  application_number text,
  applied_at date,
  notes text,
  next_action_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, post_id)
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_digest_frequency text not null default 'weekly',
  closing_soon_reminders boolean not null default true,
  saved_job_change_alerts boolean not null default true,
  subscription_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  template text not null,
  recipient text not null,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete cascade,
  code text references public.referral_codes(code),
  event_type text not null check (event_type in ('link_created', 'link_clicked', 'signup_attributed', 'first_payment_completed', 'reward_granted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.job_posts(id) on delete cascade,
  issue_type text not null,
  details text not null,
  status text not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  provider text not null default 'razorpay',
  provider_subscription_id text unique,
  status text not null,
  starts_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  provider text not null default 'razorpay',
  provider_order_id text unique,
  amount_paise integer not null,
  currency text not null default 'INR',
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users(id) on delete set null,
  filename text not null,
  status text not null default 'validated',
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  errors_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.email_delivery_logs enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referral_events enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_orders enable row level security;
alter table public.import_batches enable row level security;

create policy "users own applications" on public.applications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users own notification preferences" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users own referral codes" on public.referral_codes for select using (user_id = auth.uid());
create policy "users read own referral events" on public.referral_events for select using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());
create policy "users create reports" on public.reports for insert with check (user_id = auth.uid() or auth.uid() is null);
create policy "users read own subscriptions" on public.subscriptions for select using (user_id = auth.uid());
create policy "users read own payment orders" on public.payment_orders for select using (user_id = auth.uid());

create policy "admins manage reports" on public.reports for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read email logs" on public.email_delivery_logs for select using (public.is_admin());
create policy "admins manage imports" on public.import_batches for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read subscriptions" on public.subscriptions for select using (public.is_admin());
create policy "admins read payment orders" on public.payment_orders for select using (public.is_admin());
