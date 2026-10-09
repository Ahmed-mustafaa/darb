-- Darb school transport · initial schema
-- Run this once in Supabase → SQL Editor (or with `supabase db push`).

create extension if not exists "pgcrypto";

-- ───────────────────────── Admins ─────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- ───────────────────────── Schools ─────────────────────────
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Staff (drivers & supervisors) ─────────────────────────
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null, -- supervisor login (Phase 4)
  full_name text not null,
  phone text not null unique,          -- E.164, e.g. +201012345678
  role text not null check (role in ('driver', 'supervisor')),
  license_expiry date,                 -- drivers only
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Buses ─────────────────────────
create table public.buses (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,          -- "Bus 3"
  plate_letters text,                  -- Arabic letters, e.g. ق ب ر
  plate_number text,                   -- digits, e.g. 2961
  model text,
  capacity int not null default 15 check (capacity between 1 and 60),
  school_id uuid references public.schools(id) on delete set null,
  driver_id uuid unique references public.staff(id) on delete set null,
  supervisor_id uuid unique references public.staff(id) on delete set null,
  status text not null default 'parked' check (status in ('parked', 'on_route', 'at_school')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Parents ─────────────────────────
create table public.parents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null, -- parent login (Phase 2)
  full_name text not null,
  phone text not null unique,          -- E.164, verified by WhatsApp OTP
  relation text check (relation in ('mother', 'father', 'guardian')),
  second_name text,
  second_phone text,
  home_lat double precision,
  home_lng double precision,
  address text,
  landmark text,
  is_returning boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Children ─────────────────────────
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  full_name text not null,
  school_id uuid references public.schools(id) on delete set null,
  grade text,
  notes text,                          -- allergies, notes for the supervisor
  bus_id uuid references public.buses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index children_bus_idx on public.children(bus_id);
create index children_parent_idx on public.children(parent_id);

-- A bus can never hold more children than its capacity.
create or replace function public.check_bus_capacity()
returns trigger language plpgsql as $$
declare cap int; used int;
begin
  if new.bus_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.bus_id is not distinct from new.bus_id then return new; end if;
  select capacity into cap from public.buses where id = new.bus_id;
  select count(*) into used from public.children where bus_id = new.bus_id;
  if used >= cap then raise exception 'BUS_FULL'; end if;
  return new;
end $$;
create trigger trg_bus_capacity
  before insert or update of bus_id on public.children
  for each row execute function public.check_bus_capacity();

-- ───────────────────────── Prices (single row) ─────────────────────────
create table public.settings (
  id int primary key default 1 check (id = 1),
  monthly_price numeric not null default 1500,   -- EGP per child per month
  sibling_discount numeric not null default 15,  -- % off each child after the first
  returning_discount numeric not null default 5, -- % off for returning families
  term_months int not null default 4,
  term_discount numeric not null default 5,
  year_months int not null default 9,
  year_discount numeric not null default 10,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Payments (Phase 3) ─────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  plan text not null check (plan in ('month', 'term', 'year')),
  children_count int not null,
  amount numeric not null,
  method text check (method in ('card', 'wallet', 'fawry', 'instapay', 'cash')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Live locations (Phase 4) ─────────────────────────
create table public.bus_locations (
  bus_id uuid primary key references public.buses(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  speed_kmh double precision,
  heading double precision,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Row level security ─────────────────────────
alter table public.admins        enable row level security;
alter table public.schools       enable row level security;
alter table public.staff         enable row level security;
alter table public.buses         enable row level security;
alter table public.parents       enable row level security;
alter table public.children      enable row level security;
alter table public.settings      enable row level security;
alter table public.payments      enable row level security;
alter table public.bus_locations enable row level security;

create policy "admins read self" on public.admins for select using (user_id = auth.uid());

create policy "admin all" on public.schools       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.staff         for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.buses         for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.parents       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.children      for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.settings      for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.payments      for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.bus_locations for all using (public.is_admin()) with check (public.is_admin());

-- Schools and prices are public so the parent sign-up page can show them.
create policy "public read" on public.schools  for select using (true);
create policy "public read" on public.settings for select using (true);
