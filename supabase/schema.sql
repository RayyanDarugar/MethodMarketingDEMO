-- Method Marketing — demo persistence schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Demo-grade access model: identity is a client-generated UUID pointer, and
-- the publishable (anon) key gets full access to these three tables via
-- permissive RLS policies. When real Supabase Auth lands, tighten the
-- policies to `auth.uid() = user_id` — the app's StorageAdapter seam
-- doesn't change.

create table if not exists public.mm_users (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mm_sessions (
  user_id uuid primary key references public.mm_users (id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.mm_modules (
  id text primary key,
  user_id uuid not null references public.mm_users (id) on delete cascade,
  industry text not null,
  role text not null,
  product_name text not null,
  source text not null,
  vertical jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists mm_modules_user_created
  on public.mm_modules (user_id, created_at desc);

alter table public.mm_users enable row level security;
alter table public.mm_sessions enable row level security;
alter table public.mm_modules enable row level security;

drop policy if exists "demo anon access" on public.mm_users;
create policy "demo anon access" on public.mm_users
  for all to anon using (true) with check (true);

drop policy if exists "demo anon access" on public.mm_sessions;
create policy "demo anon access" on public.mm_sessions
  for all to anon using (true) with check (true);

drop policy if exists "demo anon access" on public.mm_modules;
create policy "demo anon access" on public.mm_modules
  for all to anon using (true) with check (true);
