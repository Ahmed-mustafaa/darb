# Darb · درب

School transport management: buses, drivers, supervisors, children, parent registration, payments and live tracking.
Web app (works on any phone or computer, no app store), Arabic by default with an English switch.

**Stack:** Next.js 14 · Supabase (database, login, live updates) · Vercel (hosting)

## Status

| Phase | What | Status |
|---|---|---|
| 1 | Database, admin login, buses, drivers & supervisors, children, bus suggestions, prices, schools | ✅ This version |
| 2 | Parent registration: WhatsApp code, home pin on a map, children, packages | Next |
| 3 | InstaPay payments: owner's QR at checkout, parent sends reference + screenshot, admin confirms | 🟡 Admin side done · parent screen comes with Phase 2 |
| 4 | Supervisor app, live bus map, WhatsApp alerts (stop before yours / 10 min away) | |

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

### 3. Connect the app to Supabase
In the project folder, copy the example settings file:
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in both values from Supabase → **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` → "Project URL"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → "anon public" key

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
1. Sign up at https://vercel.com with your GitHub account → **Add New → Project** → import `darb`.
2. Under **Environment Variables**, add the same two values from `.env.local`.
3. **Deploy**. You get a link like `darb.vercel.app` that works on any phone.

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

## Project layout
```
supabase/migrations/0001_init.sql   tables, security rules, capacity rule
supabase/seed.sql                   starter schools, prices, 6 buses
src/app/admin/login                 admin sign-in
src/app/admin/(panel)/...           overview, buses, children, staff, settings
src/lib/i18n.ts                     all Arabic & English text
src/lib/geo.ts                      distances and bus suggestions
src/lib/pricing.ts                  package prices and discounts
src/lib/phone.ts                    Egyptian phone numbers
```

## Accounts to prepare for the next phases
- **WhatsApp Business (Meta Cloud API)** – needs Meta business verification and approved message templates. Start early; approval can take days.
- **InstaPay QR code** – from your InstaPay app: Manage accounts → your account → QR code. Upload it on the Prices & schools page.
