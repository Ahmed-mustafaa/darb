-- Darb · trips, live tracking and parent alerts
-- Run after 0003_parent_signin.sql.

-- One run of a bus: morning (homes → school) or afternoon (school → homes).
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete cascade,
  kind text not null check (kind in ('morning', 'afternoon')),
  started_by uuid references public.staff(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
-- At most one running trip per bus.
create unique index trips_one_active_per_bus on public.trips (bus_id) where ended_at is null;

-- Every child on the trip, in pickup (or drop-off) order. seq is shared by siblings.
create table public.trip_children (
  trip_id uuid not null references public.trips(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  seq int not null,
  status text not null default 'waiting' check (status in ('waiting', 'picked_up', 'absent', 'dropped_off')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, child_id)
);
create index trip_children_parent_idx on public.trip_children (parent_id);

-- Messages shown to parents in the app (and sent on WhatsApp when it is set up).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  kind text not null check (kind in ('next', 'ten_min', 'picked_up', 'absent', 'dropped_off', 'at_school')),
  params jsonb not null default '{}'::jsonb,
  whatsapp_status text check (whatsapp_status in ('sent', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
-- The same alert is never sent twice for one trip.
create unique index notifications_once_per_trip on public.notifications (trip_id, parent_id, kind) where trip_id is not null;
create index notifications_parent_idx on public.notifications (parent_id, created_at desc);

-- Accuracy of the last GPS fix, in metres.
alter table public.bus_locations add column if not exists accuracy_m double precision;

alter table public.trips          enable row level security;
alter table public.trip_children  enable row level security;
alter table public.notifications  enable row level security;
create policy "admin all" on public.trips         for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.trip_children for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
-- Supervisors and parents reach these tables only through the server.
