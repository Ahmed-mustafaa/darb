-- Darb · adding a child to a running subscription
-- Run after 0006_subscription_dates.sql.

-- A child added mid-subscription waits for its own (pro-rated) payment before riding.
alter table public.children add column if not exists pending boolean not null default false;

-- 'subscription' = a package for the whole family; 'addon' = extra child(ren) until the current end date.
alter table public.payments
  add column if not exists kind text not null default 'subscription' check (kind in ('subscription', 'addon')),
  add column if not exists child_ids uuid[];
