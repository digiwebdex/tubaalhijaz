# Tuba Al Hijaz — Enterprise Umrah Operations Platform

বর্তমান project-এ ইতিমধ্যেই বড় infrastructure আছে (PostgreSQL, Express API, PM2, customers, bookings, payments, moallem, hotels, accounting, SSLCommerz, OTP login)। সম্পূর্ণ scratch থেকে শুরু করলে এই কাজ হারাবে এবং কয়েক সপ্তাহ লাগবে।

**প্রস্তাব:** existing backend (database + API) রেখে **frontend admin panel + missing operational modules** নতুন luxury Saudi-style design-এ rebuild করব। এটাই বাস্তবসম্মত এবং দ্রুততম পথ।

---

## Phase 1 — Foundation & Design System (এই message-এ)

1. **Luxury Saudi design system** apply
   - Color palette: White, Gold (#C9A96E), Soft Beige (#F5EFE6), Deep Green (#0F4C3A)
   - Typography: Playfair Display (heading) + Inter (body) + Noto Naskh Arabic (RTL)
   - `index.css` + `tailwind.config.ts`-এ semantic tokens
2. **i18n setup**: English / Arabic (RTL) / Bengali
3. **নতুন Admin Sidebar** (১৮টি module structure সহ, placeholder routes)
4. **Dashboard rebuild**: Pilgrims, Active Groups, Bookings, Catering, Visa Pending, Hotel Occupancy, Arrivals/Departures, Revenue SAR/BDT
5. **Old generic ERP-style pages লুকানো** (sidebar থেকে inventory/POS-জাতীয় কিছু থাকলে hide)

## Phase 2 — Core Operations Modules (পরের message-এ)

6. **Transport Voucher Module**
   - DB: `transport_vouchers`, `movement_schedules`
   - Bilingual EN/AR voucher PDF (QR code, agent/hotel/transport/flight sections)
   - Internal Movements table (Jeddah → Makkah → Madinah → Jeddah)
   - Auto voucher number generation
7. **Catering Module**
   - DB: `catering_bookings`
   - Schedule, delivery tracking, kitchen status, invoice
8. **Visa Processing Module**
   - DB: `visas` (status workflow: Pending/Submitted/Approved/Rejected)
   - Document upload (passport, photo)

## Phase 3 — Voucher/Invoice/PDF Polish

9. Bilingual invoice PDF (SAR + BDT, QR code, Arabic RTL layout)
10. Auto voucher generation on booking approval
11. PDF download + email attachment

## Phase 4 — Notifications & Integrations (যখন credentials দিবেন)

12. Email templates (EN/AR) — booking, invoice, visa, flight, hotel
13. SMS gateway integration (existing 880-prefix logic ব্যবহার)
14. WhatsApp Cloud API (token দিলে)
15. Real-time admin notifications (bell, sound, popup)

## Phase 5 — Reports & Settings

16. Reports: Revenue, Booking, Visa, Catering, Transport, Agent, Due (PDF + Excel)
17. Settings: Currency rates, Arabic translations, Invoice config, Roles

---

## Technical Notes

- **Backend বদলাচ্ছে না**: existing Express API + PostgreSQL + custom `@/lib/api` client রাখব (memory rule)
- **নতুন tables**: `transport_vouchers`, `movement_schedules`, `catering_bookings`, `visas`, `flights`, `agents` migration via `server/schema.sql`
- **PDF**: existing PDF architecture (A4, dark headers) extend করব bilingual support সহ
- **Currency**: SAR ↔ BDT auto convert, exchange rate settings table-এ
- **RTL**: `dir="rtl"` toggle, mirrored layout when Arabic active

---

## এই message-এ শুধু Phase 1 deliver করব

পরের প্রতিটি phase আলাদা message-এ। প্রতি phase শেষে আপনি review করে next phase approve করবেন।

**Approve করলে Phase 1 (design system + sidebar + dashboard rebuild) শুরু করছি।**