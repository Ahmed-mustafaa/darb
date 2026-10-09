-- Darb · subscription start and end dates on each confirmed payment
-- Run after 0005_passwords_push.sql.

alter table public.payments
  add column if not exists valid_from date,
  add column if not exists valid_until date;

-- Payments confirmed before this change: count from the day they were paid.
update public.payments p
set valid_from  = (p.paid_at at time zone 'Africa/Cairo')::date,
    valid_until = ((p.paid_at at time zone 'Africa/Cairo')::date
                   + make_interval(months => case p.plan when 'month' then 1
                                                        when 'term' then coalesce(s.term_months, 4)
                                                        else coalesce(s.year_months, 9) end)
                   - interval '1 day')::date
from public.settings s
where p.status = 'paid' and p.paid_at is not null and p.valid_until is null and s.id = 1;

create index if not exists payments_valid_idx on public.payments (parent_id, valid_until);
