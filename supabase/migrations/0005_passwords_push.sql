-- Darb · sign in with phone + password, and phone notifications (web push)
-- Run after 0004_trips_tracking.sql.

-- Passwords are stored only as scrypt hashes.
alter table public.parents add column if not exists password_hash text;
alter table public.staff   add column if not exists password_hash text;

-- Failed sign-ins, to slow down password guessing.
create table public.signin_attempts (
  id bigint generated always as identity primary key,
  phone text not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index signin_attempts_phone_idx on public.signin_attempts (phone, created_at desc);

-- One row per phone/browser that allowed notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  lang text not null default 'ar',
  created_at timestamptz not null default now()
);
create index push_subscriptions_parent_idx on public.push_subscriptions (parent_id);

alter table public.signin_attempts    enable row level security;
alter table public.push_subscriptions enable row level security;
create policy "admin reads" on public.push_subscriptions for select using (public.is_admin());
-- signin_attempts: no policies, only the server touches it.
