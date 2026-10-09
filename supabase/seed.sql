-- Starter data. Run after 0001_init.sql. Edit the schools to your real ones.
insert into public.settings (id) values (1) on conflict (id) do nothing;

insert into public.schools (name_ar, name_en, lat, lng) values
  ('مدرسة النور للغات',        'Al-Nour Language School',          30.0284, 31.2010),
  ('مدرسة وادي النيل الدولية', 'Nile Valley International School', 30.0395, 31.2117),
  ('مدرسة حدائق أكتوبر',       'October Gardens School',           29.9727, 30.9437);

-- Six empty buses with 15 seats each. Add plates, drivers and supervisors from the admin pages.
insert into public.buses (number, capacity, model) values
  (1, 15, 'Toyota Hiace'), (2, 15, 'Toyota Hiace'), (3, 15, 'Hyundai H350'),
  (4, 15, 'Hyundai H350'), (5, 15, 'King Long Kingo'), (6, 15, 'Mercedes Sprinter');

-- Make yourself an admin (replace the email with the one you created in Authentication → Users):
-- insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
