# TUBA ALHIJAZ — Lean-Inspired Umrah Programs + Online Order System

## Reference takeaways from lean-contracting.com
Lean Contracting positions itself as a Saudi Umrah service company with four tiered programs and four headline services. We mirror that structure but localize for TUBA ALHIJAZ (Makkah-based, Bangladeshi clientele, English primary / Bangla secondary, olive-gold theme).

**Service pillars (mirror Lean):** Umrah Visa · Hotels (Makkah & Madinah) · Transport · Reception & Farewell · Ziyarat tours.
**Program tiers (mirror Lean):** Economic ★★ · Silver ★★★ · Golden ★★★★ · Platinum ★★★★★.
**Trust signals to surface:** "Licensed by the Ministry of Hajj & Umrah", agent network worldwide, transparent pricing, downloadable company profile.

## What gets built

### 1. New homepage section: Umrah Programs (`UmrahProgramsSection.tsx`)
A 4-tier comparison grid placed between the existing Services and Transport sections.

```text
┌─ Economic ─┬─ Silver ─┬─ Golden ─┬─ Platinum ─┐
│ ★★         │ ★★★      │ ★★★★     │ ★★★★★      │
│ Hotel       │ Hotel    │ Hotel    │ 5★ Hotel   │
│ 2km Haram   │ 1km      │ 500m     │ Adjacent   │
│ Shared room │ Quad     │ Triple   │ Double     │
│ Bus         │ Hiace    │ SUV      │ Sedan VIP  │
│ Standard    │ Standard │ Premium  │ Buffet 5★  │
│  meals      │ meals    │ meals    │            │
│ From SAR X  │ SAR Y    │ SAR Z    │ SAR W      │
│ [Book Now]  │ [Book]   │ [Book]   │ [Book]     │
└─────────────┴──────────┴──────────┴────────────┘
```
- Each card uses the gold gradient accent on hover; "Most Popular" ribbon on Golden.
- Star ratings rendered with `lucide-react` Star icons.
- Inclusion checklist (Visa ✓ · Hotel ✓ · Transport ✓ · Meals ✓ · Ziyarat ✓) per tier.
- "Book Now" opens the new `UmrahOrderDialog` pre-filled with the chosen tier.

### 2. New homepage section: Why Choose Us / Trust Bar
Six-icon strip mirroring Lean's credibility cues:
- Licensed Saudi Operator · Makkah-based Office · 24/7 Arabic+English+Bangla Support · Direct Hotel Contracts · Transparent Pricing · Worldwide Agent Network.

### 3. Online Order System (`UmrahOrderDialog.tsx` + admin module)

**Customer flow (5-step stepper inside one dialog):**
1. **Program** — chosen tier (Economic/Silver/Golden/Platinum) + travel month.
2. **Travelers** — number of pilgrims, room type, with/without children, age groups.
3. **Services** — checkboxes: Visa, Hotel (Makkah nights, Madinah nights), Transport vehicle, Catering package, Ziyarat tour, Reception/Farewell.
4. **Contact** — full name, phone (BD or intl), email, passport ready (yes/no), special requests.
5. **Review & Submit** — auto-calculated estimate (sum of tier base × pax + add-on services), submit button. After submit: success screen with tracking ID `TT-…` + WhatsApp deep link to `+966 5x xxx xxxx`.

Submission writes to a new `umrah_orders` table; guest orders use the all-zero UUID per memory rules. Authenticated users get linked to their `customer_id`.

**Admin module (`AdminUmrahOrdersPage.tsx`):** List + filters (status, tier, month), detail drawer, status workflow (pending → contacted → quoted → confirmed → completed → cancelled), assign-to-staff field, internal notes, export CSV. Wired into `AdminSidebar` under Main with a `ScrollText` icon, and into `App.tsx` route `/admin/umrah-orders`.

### 4. Database (migration)

```sql
create table public.umrah_orders (
  id uuid primary key default gen_random_uuid(),
  tracking_id text unique,                -- TT-UMR-YYYYMMDD-####
  customer_id uuid,
  user_id uuid,                           -- zero-UUID for guests
  program_tier text not null,             -- economic|silver|golden|platinum
  travel_month text,
  num_travelers int not null default 1,
  room_type text,                         -- shared|quad|triple|double
  makkah_nights int default 0,
  madinah_nights int default 0,
  include_visa boolean default true,
  include_hotel boolean default true,
  transport_vehicle text,                 -- sedan|suv|hiace|bus|none
  catering_package_id uuid references public.catering_packages(id),
  include_ziyarat boolean default false,
  include_reception boolean default true,
  estimated_price_sar numeric default 0,
  estimated_price_bdt numeric default 0,
  guest_name text, guest_phone text, guest_email text,
  passport_ready boolean default false,
  special_requests text,
  assigned_to uuid,
  internal_notes text,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- RLS: anyone can INSERT (guest checkout); admins/accountants/booking can SELECT/UPDATE; users can SELECT own.
-- Trigger: auto-generate tracking_id on insert (TT-UMR-...).
```

### 5. Translations
Add `umrah.programs.*`, `umrah.order.*`, `whyUs.*` keys to both `en` and `bn` blocks in `src/i18n/translations.ts`. English primary, Bangla secondary.

### 6. Files to create / edit

**Create**
- `src/components/UmrahProgramsSection.tsx`
- `src/components/WhyChooseUsSection.tsx`
- `src/components/UmrahOrderDialog.tsx` (5-step stepper, zod-validated)
- `src/pages/admin/AdminUmrahOrdersPage.tsx`
- `supabase/migrations/<ts>_umrah_orders.sql`

**Edit**
- `src/pages/Index.tsx` — insert two new sections in order: Hero → Services → **Programs** → **WhyUs** → Transport → Catering → About → Contact.
- `src/components/admin/AdminSidebar.tsx` — add Umrah Orders menu item.
- `src/App.tsx` — lazy import + route `/admin/umrah-orders`.
- `src/i18n/translations.ts` — new keys.

### 7. Out of scope (this round)
- Online card payments for the order (the order is a quote-request; finance is recorded later via existing Bookings/Payments flow).
- Editing existing booking/payment pipeline.
- Production data wipe / VPS deploy steps.

## Validation checklist after build
- [ ] Programs grid responsive on 1327px and mobile.
- [ ] Order dialog 5 steps, zod-validated, guest submit works without auth.
- [ ] Admin Orders page lists submissions and allows status updates.
- [ ] Tracking ID generated with `TT-UMR-` prefix; visible on confirmation screen.
- [ ] EN default / BN toggle covers all new copy.
