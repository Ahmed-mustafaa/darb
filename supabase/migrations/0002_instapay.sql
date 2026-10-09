-- Darb · payments through the owner's InstaPay account
-- Parents scan the owner's InstaPay QR, pay, then submit the transaction reference
-- and a screenshot. An admin checks the bank app and confirms or rejects.
-- Run after 0001_init.sql.

-- ───────────────────────── InstaPay account details (shown to parents) ─────────────────────────
alter table public.settings
  add column instapay_name    text,  -- account holder name as InstaPay shows it
  add column instapay_address text,  -- e.g. darb@instapay
  add column instapay_mobile  text,  -- mobile linked to InstaPay (optional)
  add column instapay_link    text,  -- payment link, e.g. https://ipn.eg/S/darb/instapay/...
  add column instapay_qr_path text;  -- QR image in the "instapay" storage bucket

-- ───────────────────────── Payments: manual review ─────────────────────────
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments alter column status set default 'awaiting_payment';
update public.payments set status = 'awaiting_payment' where status = 'pending';
update public.payments set status = 'rejected' where status = 'failed';
update public.payments set method = 'instapay' where method is null or method not in ('instapay', 'cash');
alter table public.payments alter column method set default 'instapay';

alter table public.payments
  add constraint payments_method_check check (method in ('instapay', 'cash')),
  add constraint payments_status_check check (status in ('awaiting_payment', 'awaiting_review', 'paid', 'rejected', 'refunded'));

create sequence if not exists public.payment_code_seq start 1001;

alter table public.payments
  add column code text unique default ('DRB-' || nextval('public.payment_code_seq')), -- parent writes this in the transfer note
  add column reference text,          -- InstaPay transaction reference typed by the parent
  add column payer_name text,         -- name on the paying account
  add column proof_path text,         -- screenshot in the "payment-proofs" bucket
  add column submitted_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add column reject_reason text;

-- The same InstaPay reference can never be used for two payments.
create unique index if not exists payments_reference_unique on public.payments (lower(reference)) where reference is not null;
create index if not exists payments_status_idx on public.payments (status);

-- ───────────────────────── Storage buckets ─────────────────────────
insert into storage.buckets (id, name, public)
values ('instapay', 'instapay', true),              -- the owner's QR: anyone can view it
       ('payment-proofs', 'payment-proofs', false)  -- parents' screenshots: private
on conflict (id) do nothing;

create policy "admin manages instapay qr" on storage.objects
  for all using (bucket_id = 'instapay' and public.is_admin())
  with check (bucket_id = 'instapay' and public.is_admin());

create policy "admin reads payment proofs" on storage.objects
  for select using (bucket_id = 'payment-proofs' and public.is_admin());
-- Parents' upload rules for "payment-proofs" are added with parent sign-in (Phase 2).
