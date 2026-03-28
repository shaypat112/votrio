create extension if not exists "pgcrypto";

create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  repo_url text not null unique,
  name text not null,
  description text,
  tags text[] not null default array[]::text[],
  is_public boolean not null default false,
  status text not null default 'pending',
  review_count int not null default 0,
  rating_total int not null default 0,
  rating_avg numeric(3,2) not null default 0,
  last_review_excerpt text,
  last_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repositories_public_idx on public.repositories (is_public, created_at desc);
create index if not exists repositories_owner_idx on public.repositories (owner_id, created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repositories (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists reviews_repo_idx on public.reviews (repo_id, created_at desc);
create index if not exists reviews_author_idx on public.reviews (author_id, created_at desc);

create table if not exists public.review_flags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  enabled boolean not null default true,
  events text[] not null default array['repository.published','review.created','scan.completed'],
  secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_endpoints_user_unique unique (user_id)
);

create index if not exists webhook_endpoints_user_idx on public.webhook_endpoints (user_id);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempt_count int not null default 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhook_deliveries_retry_idx on public.webhook_deliveries (status, next_retry_at);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  message text not null,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_customers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint team_members_unique unique (team_id, user_id)
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  email text,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending',
  token text not null unique,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- RLS
alter table public.repositories enable row level security;
alter table public.reviews enable row level security;
alter table public.review_flags enable row level security;
alter table public.notifications enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.activity_log enable row level security;
alter table public.site_feedback enable row level security;
alter table public.scan_history enable row level security;
alter table public.billing_customers enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

-- profiles table is managed by Supabase auth; ensure team features can resolve usernames
create policy "Authenticated can read profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Public can read published repositories"
  on public.repositories for select
  using (is_public = true and status = 'published');

create policy "Owners can manage repositories"
  on public.repositories for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Public can read non-deleted reviews"
  on public.reviews for select
  using (deleted_at is null);

create policy "Authors can manage reviews"
  on public.reviews for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authenticated can flag reviews"
  on public.review_flags for insert
  with check (auth.uid() = reporter_id);

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Authenticated can insert notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can manage webhooks"
  on public.webhook_endpoints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated can read webhooks"
  on public.webhook_endpoints for select
  using (auth.uid() is not null);

create policy "Users can read webhook deliveries"
  on public.webhook_deliveries for select
  using (auth.uid() in (select user_id from public.webhook_endpoints where id = webhook_id));

create policy "Authenticated can insert activity log"
  on public.activity_log for insert
  with check (auth.uid() is not null);

create policy "Authenticated can insert feedback"
  on public.site_feedback for insert
  with check (auth.uid() is not null);

create policy "Users can read own scans"
  on public.scan_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scan_history for insert
  with check (auth.uid() = user_id);

create policy "Users can read own billing"
  on public.billing_customers for select
  using (auth.uid() = user_id);

create policy "Users can update own billing"
  on public.billing_customers for update
  using (auth.uid() = user_id);

create policy "Users can insert own billing"
  on public.billing_customers for insert
  with check (auth.uid() = user_id);

create policy "Team members can read teams"
  on public.teams for select
  using (
    auth.uid() = owner_id or
    auth.uid() in (select user_id from public.team_members where team_id = id)
  );

create policy "Owners can create teams"
  on public.teams for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update teams"
  on public.teams for update
  using (auth.uid() = owner_id);

create policy "Members can read team members"
  on public.team_members for select
  using (
    auth.uid() = user_id or
    auth.uid() in (select owner_id from public.teams where id = team_id)
  );

create policy "Owners can manage team members"
  on public.team_members for all
  using (auth.uid() in (select owner_id from public.teams where id = team_id))
  with check (auth.uid() in (select owner_id from public.teams where id = team_id));

create policy "Owners can manage team invites"
  on public.team_invites for all
  using (auth.uid() in (select owner_id from public.teams where id = team_id))
  with check (auth.uid() in (select owner_id from public.teams where id = team_id));
