# Transport Voucher Form (PDF-style, Bilingual)

পুরনো TransportOrderDialog ফরম পুরোপুরি replace হবে — PDF voucher (901214552_SAAD_USWA) এর হুবহু লেআউটে নতুন ফরম। প্রতিটি label-এ Arabic + English পাশাপাশি থাকবে। দ্বিতীয় attachment (Transportation company / Booking number-এর partial table) যোগ হবে না।

## Form Sections (PDF order অনুযায়ী)

**1. Header Row**
- Agent name / اسم الوكيل
- Agent country / دولة الوكيل
- Umrah Company / شركة عمرة

**2. Group Info**
- Group numbers / أرقام المجموعات — **multiple add/remove** ("+ Add another" বাটন, প্রতিটি ইনপুট আলাদা chip আকারে delete-যোগ্য)
- Package / Program name (e.g. REYAZUL JANNAH)
- Travel date / التاريخ

**3. Hotel Details (2 rows: Makkah + Madinah)**
- City / المدينة (read-only Makkah / Madinah label)
- Hotel name / الفندق
- Agreement No.
- Check-in date / تاريخ الدخول (date picker)
- Check-out date / تاريخ الخروج (date picker)
- Nights / عدد الليالي (auto-calculated)
- Total Rooms / عدد الغرف

**4. Transport Block**
- Type of transportation / نوع الحافلة (auto-filled from clicked card: Bus/Coaster/Hiace/SUV/Sedan)
- Number of pilgrims / عدد المعتمرين

**5. Flights (2 rows: Arrival + Departure)**
- Type / نوع (Arrival / Departure — fixed)
- Airport / مطار
- Date / التاريخ
- Time / الوقت
- Flight number / رقم الرحلة
- Airline / الخطوط

**6. Internal Movements / التحركات الداخلية**
- Repeating rows: S/N, Date, From, To, Time
- "+ Add row" / "Remove" বাটন (default 5 row pre-filled খালি)

**7. Supervisors / بيانات المناديب**
- Makkah supervisor mobile / جوال المشرف في مكة
- Madinah supervisor mobile / جوال المشرف في المدينة
- 24h Operations mobile / جوال العمليات 24 ساعة

**8. Customer Contact (submission এর জন্য)**
- Name, Phone, Email, Notes

## Behavior

- "Book Now" বাটনে ক্লিক করলে এই dialog খুলবে; selected vehicle type auto-fill হবে।
- Submit হলে:
  1. **Database save** — নতুন `transport_voucher_orders` table-এ পুরো voucher JSON সহ insert
  2. **Notification** — admin কে edge function এর মাধ্যমে email/SMS পাঠাবে (existing `send-notification` reuse)
- Success message + tracking reference দেখাবে।

## Technical Section

**Files**
- `src/components/TransportOrderDialog.tsx` — পুরো rewrite (পুরনো simple form delete)
- `src/components/TransportSection.tsx` — import unchanged, props pass করবে selected vehicle
- নতুন migration: `transport_voucher_orders` table

**Database (`transport_voucher_orders`)**
- `id`, `created_at`
- `agent_name`, `agent_country`, `umrah_company`
- `group_numbers` (text[])
- `package_name`, `travel_date`
- `hotels` (jsonb) — array of {city, hotel, agreement_no, check_in, check_out, nights, rooms}
- `transport_type`, `pilgrim_count`
- `flights` (jsonb) — array of {type, airport, date, time, flight_no, airline}
- `internal_movements` (jsonb) — array of {sn, date, from, to, time}
- `supervisor_makkah_phone`, `supervisor_madinah_phone`, `ops_24h_phone`
- `contact_name`, `contact_phone`, `contact_email`, `notes`
- `status` default 'pending'
- RLS: anyone can INSERT (public booking), only admin can SELECT/UPDATE

**UI**
- shadcn Dialog with `max-w-4xl`, scroll-area
- Each label: `<span>EN / <span dir="rtl">عربي</span></span>` pattern
- Group numbers: array state, map to chips with X button + "+ Add" input
- Internal movements: dynamic rows with add/remove
- Date pickers: shadcn Calendar in Popover (with `pointer-events-auto`)
- Validation: zod schema (group numbers ≥1, package_name required, contact_name+phone required)
- Submit → `supabase.from('transport_voucher_orders').insert()` → toast success + notification edge function call

```text
┌─ Dialog: Transport Voucher / قسيمة النقل ──────────┐
│  Agent | Country | Umrah Company                  │
│  Group#: [chip] [chip] [+ Add]   Package   Date   │
│  ┌─Hotels─────────────────────────────────────┐   │
│  │ Makkah  | Hotel | Agr# | In | Out | N | R │   │
│  │ Madinah | Hotel | Agr# | In | Out | N | R │   │
│  └────────────────────────────────────────────┘   │
│  Transport: [Bus]   Pilgrims: [__]                │
│  ┌─Flights────────────────────────────────────┐   │
│  │ Arrival   | Airport | Date | Time | F# | A│   │
│  │ Departure | Airport | Date | Time | F# | A│   │
│  └────────────────────────────────────────────┘   │
│  Internal Movements [+ Add row]                   │
│  Supervisors: Makkah / Madinah / 24h              │
│  Contact: Name / Phone / Email / Notes            │
│           [Cancel]  [Submit Booking]              │
└────────────────────────────────────────────────────┘
```
