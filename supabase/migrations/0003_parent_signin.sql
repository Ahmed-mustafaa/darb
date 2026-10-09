-- Darb · parent sign-in with a one-time code sent on WhatsApp
-- Only the server (service role key) reads or writes this table.
-- Run after 0002_instapay.sql.

create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,                 -- E.164
  code_hash text not null,             -- sha256 of the code + server secret, never the code itself
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_codes_phone_idx on public.otp_codes (phone, created_at desc);

alter table public.otp_codes enable row level security;
-- No policies on purpose: browsers can never read codes.

-- Admins can see which families have finished paying.
create index if not exists payments_parent_idx on public.payments (parent_id);
