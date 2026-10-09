# Darb · درب

School transport management: buses, drivers, supervisors, children, parent registration, payments and live tracking.
Web app (works on any phone or computer, no app store), Arabic by default with an English switch.

**Stack:** Next.js 14 · Supabase (database, login, live updates) · Vercel (hosting)

## Status

| Phase | What | Status |
|---|---|---|
| 1 | Database, admin login, buses, drivers & supervisors, children, bus suggestions, prices, schools | ✅ |
| 2 | Parent registration: WhatsApp code (test mode until WhatsApp is approved), home pin on a map, children, packages | ✅ |
| 3 | InstaPay payments: owner's QR at checkout, parent sends reference + screenshot, admin confirms and the bus is assigned | ✅ |
| 4 | Crew app for drivers & supervisors, live bus map for parents and admin, "you're next" + 10-minute alerts | ✅ |

---

## Run it on your computer (about 20 minutes, once)

### 1. Install Node.js
Download the **LTS** version from https://nodejs.org and install it. Check in a terminal:
```bash
node -v   # should print v20 or newer
```

### 2. Create a Supabase project
1. Sign up at https://supabase.com (free plan is fine) → **New project**. Pick the region closest to Egypt (e.g. Frankfurt).
2. Open **SQL Editor → New query**, paste everything from `supabase/migrations/0001_init.sql`, press **Run**.
3. New query again, paste `supabase/seed.sql`, press **Run**. This adds 3 example schools, default prices and 6 empty buses.
4. New query again, paste `supabase/migrations/0002_instapay.sql`, press **Run**. This adds InstaPay payments and the storage for QR codes and receipts.
5. New query again, paste `supabase/migrations/0003_parent_signin.sql`, press **Run**. This adds parent sign-in codes.
6. New query again, paste `supabase/migrations/0004_trips_tracking.sql`, press **Run**. This adds trips, live tracking and parent alerts.

### 3. Connect the app to Supabase
In the project folder, copy the example settings file:
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` → Supabase → Project Settings → **Data API** → Project URL (only `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Project Settings → **API Keys** → `anon public` (Legacy API keys tab)
- `SUPABASE_SERVICE_ROLE_KEY` → same page → `service_role` (secret: never share it or put it anywhere else)
- `SESSION_SECRET` → run `openssl rand -hex 32` in the terminal and paste the result
- `OTP_TEST_MODE=true` → shows the parent sign-in code on screen until WhatsApp is set up

Never commit `.env.local` (it is already in `.gitignore`).

### 4. Create your admin account
1. Supabase → **Authentication → Users → Add user → Create new user**. Enter your email and a strong password, tick "Auto confirm".
2. SQL Editor → run (with your email):
```sql
insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
```

### 5. Start the app
```bash
npm install
npm run dev
```
Open http://localhost:3000/admin and sign in.

If anything fails, copy the full error from the terminal or browser and send it to Claude.

---

## Put it online (Vercel)
1. Sign up at https://vercel.com **with your GitHub account** → **Add New → Project** → import `darb`.
2. Open **Environment Variables** and add the same five names and values as in your `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `OTP_TEST_MODE`).
3. **Deploy**. After a minute or two you get a link like `darb-xxxx.vercel.app` that works on any phone.
   The servers run in Frankfurt (set in `vercel.json`), next to your Supabase database.
4. Every time new code is pushed to GitHub, Vercel updates the site by itself.

## Test the whole flow with a 5 EGP payment
1. **Admin → Prices & schools:** add your real school(s). Set *Monthly price per child* to **5** and save.
   Upload your InstaPay QR and add your InstaPay address / payment link, then save.
2. **Admin → Buses:** give at least one bus that school, so a bus can be assigned.
3. On your phone, open the site → **Register your children**:
   name + your number → the code appears on screen (test mode) → place the pin → add 1 child → choose **Monthly** (5 EGP).
4. On the payment screen, pay **5 EGP** with InstaPay (scan the QR or tap *Open InstaPay*), writing the payment code in the note.
   Then type the InstaPay reference, attach the screenshot and press **Send receipt**.
5. **Admin → Payments:** the transfer appears with the screenshot. Check your InstaPay app and press **Confirm payment**.
   The child is placed on the closest bus automatically.
6. Back on the phone, refresh: the status shows *You're registered* with the bus and supervisor.
7. Put the real monthly price back afterwards.

---

## What's in Phase 1

- **Overview** – buses, seats filled, children without a bus, staff count, fleet cards.
- **Buses** – add buses (number, Egyptian plate, model, seats, school), assign a driver and supervisor. A person can only be on one bus; assigning them elsewhere moves them.
- **Children** – search and filter, move a child to another bus, add children from your paper/Excel records.
  The database refuses to put more children on a bus than its seats.
- **Bus suggestions** – for each child without a bus, Darb looks at buses going to that child's school with a free seat and picks the one whose pickups are closest to the child's home. Accept one by one or all at once.
- **Drivers & supervisors** – add people (Egyptian mobile numbers are checked and stored as +20…), assign or deactivate them.
- **Prices & schools** – monthly price per child, sibling / returning-family / term / full-year discounts with a live preview, and your schools with their locations.
- **Your InstaPay account** (Prices & schools page) – upload your InstaPay QR code and add your InstaPay address and payment link. Parents see these at checkout.
- **Payments** – transfers parents have sent, each with the amount, a payment code (DRB-1001…), the InstaPay reference and the receipt screenshot. Check your bank/InstaPay app, then **Confirm** or **Reject** with a reason. The same InstaPay reference can't be used twice. You can also record payments received outside the app (InstaPay or cash).

### How an InstaPay payment works
1. The parent picks a package and sees the amount, a payment code, your QR code, your InstaPay address and a "Pay in InstaPay" button.
2. They scan the QR (or tap the button on their phone) and pay the exact amount, writing the payment code in the transfer note.
3. They type the InstaPay reference and upload a screenshot of the receipt.
4. You confirm it on the Payments page, and their registration becomes active.

InstaPay doesn't tell the app automatically when a transfer arrives to a personal or business account, which is why step 4 is done by you. If you later want automatic confirmation, a payment company such as Kashier can generate InstaPay QR codes and confirm them automatically, for a fee.

## Trips, live tracking and alerts

**Crew app** (`/crew`): drivers and supervisors sign in with the mobile number saved in *Drivers & supervisors*
(same WhatsApp code as parents). Either of them can start the trip and share the bus location.
- **Start morning trip / Start afternoon trip.** All children whose family has paid are put in order:
  morning starts at the home farthest from school and always goes to the nearest next one; afternoon starts at school.
- **Location:** the phone sends its GPS position every ~8 s while the screen is on. Keep the page open and the phone
  on a charger; a web page can't send the location while the phone is locked or another app is in front.
- **Next stop** with a *Navigate* button (Google Maps directions) and the parent's number.
- **Supervisor** marks each child *Picked up* or *Absent* (afternoon: *Dropped off*). The driver sees the list read-only.
- **End trip** when you arrive. Morning: parents get "arrived at school".

**Alerts to parents**
- **You're next:** when the stop before theirs is marked done (or the trip starts and they are first).
- **10 minutes away:** estimated from the bus position (straight-line distance × 1.35 at 20 km/h), as a safety net.
- Also: picked up, absent, dropped off, arrived at school.
- Today they appear in the parent's app (pop-up + vibration while the page is open) and under *Messages*.
  Once WhatsApp is set up they are also sent on WhatsApp (templates `darb_bus_next` with {{1}} = bus number and
  `darb_bus_10min` with {{1}} = bus number, {{2}} = minutes).

**Parents** see the bus on a map with minutes away and how many stops are before them, on their status page.
**Admin → Live map** shows every bus, its last position, speed, stops done and next stop. Click a bus to see its stops.

### Test it without driving
With `OTP_TEST_MODE=true`, the crew screen has **Test: simulate driving to the next stop**: the bus moves toward the
next stop by itself (about 150 m every 3 s). Mark the child picked up, and simulate again to the next stop.
1. *Drivers & supervisors*: add yourself as a **supervisor** with your own mobile number and put yourself on the bus your test child rides.
2. Open `/crew` (from the home page: *Driver or supervisor? Sign in*), sign in, **Start morning trip**.
3. In another tab/phone open the parent page: you get "You're next" straight away, then the bus moving and the minutes counting down.
4. Real GPS needs the site online over https (Vercel) or `localhost`; a phone opening your laptop's address over plain http can't share its location.

## Project layout
```
supabase/migrations/0001_init.sql   tables, security rules, capacity rule
supabase/seed.sql                   starter schools, prices, 6 buses
supabase/migrations/0002_instapay.sql   InstaPay payments + storage
supabase/migrations/0003_parent_signin.sql   parent sign-in codes
src/app/admin/login                 admin sign-in
src/app/admin/(panel)/...           overview, buses, children, staff, payments, settings
src/app/(parent)/...                parent registration, sign-in, payment, status page
src/lib/whatsapp.ts                 WhatsApp sign-in codes and bus alerts (Meta Cloud API) + test mode
src/lib/trips.ts                    trip start/end, stop order, arrival estimates, alerts
src/app/(parent)/crew               crew app for drivers & supervisors
src/app/admin/(panel)/live          admin live map
src/lib/i18n.ts                     all Arabic & English text
src/lib/geo.ts                      distances and bus suggestions
src/lib/pricing.ts                  package prices and discounts
src/lib/phone.ts                    Egyptian phone numbers
```

## Accounts to prepare for the next phases
- **WhatsApp Business (Meta Cloud API)** – needs Meta business verification and an approved **Authentication** template
  (name it `darb_login_code`, one code parameter, "Copy code" button). Then add `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
  and set `OTP_TEST_MODE=false`. **Turn test mode off before real parents use the app**: in test mode anyone can sign in
  as any number because the code is shown on screen.
- **InstaPay QR code** – from your InstaPay app: Manage accounts → your account → QR code. Upload it on the Prices & schools page.
