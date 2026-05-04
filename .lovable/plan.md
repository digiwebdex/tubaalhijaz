
# TUBA ALHIJAZ — Full Rebrand & New Service Modules

Rebrand the remixed Triptastic project to **TUBA ALHIJAZ** (طوبى الحجاز), a Makkah-based Umrah service company. Replace all old data/branding, add Transport and Catering modules end-to-end (website + admin + backend), and switch default language to English (Bangla secondary).

---

## 1. Brand Identity

**Company:** TUBA ALHIJAZ (طوبى الحجاز)
**Tagline:** Your Trusted Companion for Umrah & Hajj
**Director:** Muhammad Toki Ullah
**Phone:** +966 53 491 9814 / +966 549 642 295
**Email:** tubaalhijaz@gmail.com
**Address:** 9QPP+H8Q, King Fahd Road, Al-Askan, Makkah Al-Mukarramah 24342 (Ibrahim Al Khalil Road, Makkah 21955)
**Website:** tubaalhijaz.com

**Theme (from business card):**
- Primary: Olive/Dark Green `#3D4A2A` (deep olive)
- Accent: Gold `#C9A961`
- Background: Cream `#F5EFE3` / White
- Text: Charcoal `#1A1F14`
- Style: Premium minimalist, Arabic calligraphy accents, gold dividers

Logo from uploaded business card / PDF will be saved to `src/assets/tuba-logo.png` (extracted from `طوبى_الحجاز.pdf`) and replace `triptastic-logo.png` everywhere.

---

## 2. Services Offered (current)

1. **Umrah Visa** – visa processing
2. **Hotel** – Makkah & Madinah accommodations
3. **Transport** – airport pickup, intercity (Makkah–Madinah–Jeddah), Ziyarah tours
4. **Catering** – meal packages for pilgrims

Future (placeholder section "Coming Soon"): Hajj, Umrah Full Packages, Student Consultancy.

---

## 3. Website Changes

**Pages to rewrite content:**
- `index.html` — title, meta, OG, canonical → tubaalhijaz.com
- `HeroSection.tsx` — new headline "Your Sacred Journey Starts in Makkah", olive/gold gradient, Kaaba imagery
- `ServicesSection.tsx` — 4 cards: Umrah Visa, Hotel, Transport, Catering
- `AboutSection.tsx` / `pages/About.tsx` — TUBA ALHIJAZ story (Makkah-based)
- `ContactSection.tsx` / `pages/Contact.tsx` — new phone/email/address, Makkah map embed
- `Footer.tsx` — new logo, contacts, address
- `Navbar.tsx` — new logo, add Transport & Catering links
- `PackagesSection.tsx` — repurpose for Umrah packages or hide via section visibility

**New website sections:**
- `TransportSection.tsx` — vehicle types (Sedan, SUV, Hiace, Bus), routes, pricing tiers, "Book Transport" CTA
- `CateringSection.tsx` — meal plans (Breakfast/Lunch/Dinner), Bangladeshi/Arabic cuisine options, group catering, "Order Catering" CTA

**Theme update** in `src/index.css` and `tailwind.config.ts`:
- Replace HSL CSS variables: `--primary`, `--secondary`, `--accent` to olive/gold palette
- Update gradient utilities

**Language:**
- Switch default in `src/i18n/LanguageContext.tsx` from `bn` → `en`
- Keep all `bn` translations as secondary; add new keys for Transport/Catering sections
- LocalStorage default fallback → `en`

**Old data cleanup:**
- Update `pdfCompanyConfig.ts` defaults
- Update `site_content` rows via SQL migration (insert/upsert new company info, clear stale)
- Clear sample bookings/customers via admin (note for user; keep DB structure)

---

## 4. Backend / Admin (Transport & Catering modules)

**New DB tables (migration):**
```sql
transport_services (id, vehicle_type, route_from, route_to, capacity,
  price_bdt, price_sar, image_url, description, is_active, show_on_website,
  display_order, created_at, updated_at)

transport_bookings (id, customer_id, user_id, vehicle_type, pickup_location,
  dropoff_location, pickup_datetime, passengers, total_price, currency,
  status, notes, created_at, updated_at)

catering_packages (id, name, meal_type, cuisine, price_per_meal, min_persons,
  description, image_url, is_active, show_on_website, display_order,
  created_at, updated_at)

catering_orders (id, customer_id, user_id, package_id, persons, days,
  start_date, total_price, currency, delivery_address, status, notes,
  created_at, updated_at)
```
- RLS PERMISSIVE policies (per project convention) — admins manage, customers see own.
- Soft-delete via `status='deleted'`; financial calc excludes `cancelled`.
- Triggers updated_at, audit log integration.

**Admin pages (new):**
- `pages/admin/AdminTransportPage.tsx` — manage transport services + bookings tabs
- `pages/admin/AdminCateringPage.tsx` — manage catering packages + orders tabs
- Add to `AdminSidebar.tsx` under a new "Operations" group
- Add to `MenuVisibilityManager` so primary admin can toggle

**Server routes** (`server/routes/`): `transport.js`, `catering.js` with CRUD + booking endpoints, JWT auth, audit middleware.

**Booking flows:**
- Public Transport booking dialog (`TransportBookingDialog.tsx`) — guest allowed (uses zero-UUID per project convention)
- Public Catering order dialog (`CateringOrderDialog.tsx`)
- Both feed into existing payments/notifications pipeline (SMS via BulkSMSBD, email via Resend) — already wired.

---

## 5. Files to Modify (high-level)

```
index.html
src/index.css, tailwind.config.ts          (theme)
src/i18n/LanguageContext.tsx, translations.ts (default=en + new keys)
src/assets/tuba-logo.png                   (new, replaces triptastic-logo)
src/components/{Navbar,Footer,Hero,About,Services,Contact}Section.tsx
src/components/TransportSection.tsx        (new)
src/components/CateringSection.tsx         (new)
src/components/booking/TransportBookingDialog.tsx (new)
src/components/booking/CateringOrderDialog.tsx    (new)
src/pages/{Index,About,Contact}.tsx
src/pages/admin/AdminTransportPage.tsx     (new)
src/pages/admin/AdminCateringPage.tsx      (new)
src/components/admin/AdminSidebar.tsx
src/lib/pdfCompanyConfig.ts                (defaults)
server/routes/transport.js, catering.js    (new)
server/index.js                            (mount routes)
supabase migration                         (new tables + site_content upsert)
mem://style/brand-identity                 (overwrite with TUBA ALHIJAZ info)
```

---

## 6. Out of Scope (not done in this pass)

- Production data wipe on VPS Postgres (you can run truncate via admin Backup/Restore page after deploy)
- Custom domain Nginx config for tubaalhijaz.com (separate VPS task)
- Hajj / Student Consultancy pages (will add a "Coming Soon" placeholder only)
- Gateway secrets already updated by you (SSLCommerz / Resend / BulkSMSBD)

---

## 7. Reference Inspiration

basmaemaargroup.com structure used as layout reference for: hero with KSA Vision 2030 + Kaaba imagery, "Book Special Transport" prominent CTA, Umrah Visa highlighted, clean call-center header. We will adapt this layout to the TUBA olive/gold theme — not copy.

---

Approve to proceed and I will implement in this order:
1. Theme + logo + i18n default (visible immediately in preview)
2. Rebrand all existing pages (Hero/Services/About/Contact/Footer/Navbar)
3. DB migration + admin pages for Transport & Catering
4. Public Transport & Catering sections + booking dialogs
5. Server routes + final polish
