create extension if not exists "pgcrypto";

create table if not exists public.jit_access_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  repo_id uuid not null references public.repositories (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  team_environment_id uuid references public.team_environments (id) on delete set null,
  resource_type text not null check (resource_type in ('Database', 'Admin Panel', 'API')),
  access_type text not null check (access_type in ('Read', 'Write', 'Admin')),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  duration_minutes integer not null check (duration_minutes in (15, 30, 60)),
  expires_at timestamptz not null,
  reason text not null default '',
  repo_name_snapshot text not null,
  repo_url_snapshot text not null,
  environment_name text not null,
  environment_slug text not null,
  environment_region text not null default 'us-east-1',
  sandbox_runtime text not null default 'Node.js 20',
  branch_name text not null default 'main',
  started_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jit_access_sessions_user_idx
  on public.jit_access_sessions (user_id, created_at desc);

create index if not exists jit_access_sessions_repo_idx
  on public.jit_access_sessions (repo_id, created_at desc);

create index if not exists jit_access_sessions_status_idx
  on public.jit_access_sessions (status, expires_at);

alter table public.jit_access_sessions enable row level security;

create policy "Users can read own jit sessions"
  on public.jit_access_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own jit sessions"
  on public.jit_access_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own jit sessions"
  on public.jit_access_sessions for update
  using (auth.uid() = user_id);
