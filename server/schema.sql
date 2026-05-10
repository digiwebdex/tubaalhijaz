-- =============================================
-- TRIP TASTIC ERP - Complete PostgreSQL Schema
-- Run this on your VPS PostgreSQL instance
-- =============================================

-- Create database (run as superuser)
-- CREATE DATABASE triptastic;

-- Connect to the database before running the rest
-- \c triptastic

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE app_role AS ENUM ('admin', 'user', 'manager', 'staff', 'viewer', 'accountant', 'booking', 'cms');

-- =============================================
-- SECURITY: Admin Protection Functions & Triggers
-- =============================================

-- Prevent creating new admin roles
CREATE OR REPLACE FUNCTION protect_admin_role_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.user_id != '9c56194a-b0f9-4878-ac57-e97371acd199' THEN
    RAISE EXCEPTION 'Cannot assign admin role to any user. Admin role is permanently locked.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent changing admin role
CREATE OR REPLACE FUNCTION protect_admin_role_update()
RETURNS trigger AS $$
BEGIN
  -- Cannot change primary admin's role
  IF OLD.user_id = '9c56194a-b0f9-4878-ac57-e97371acd199' AND OLD.role = 'admin' AND NEW.role != 'admin' THEN
    RAISE EXCEPTION 'Cannot change the primary admin role';
  END IF;
  -- Cannot give admin role to anyone else
  IF NEW.role = 'admin' AND NEW.user_id != '9c56194a-b0f9-4878-ac57-e97371acd199' THEN
    RAISE EXCEPTION 'Cannot assign admin role. Admin role is permanently locked.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent deleting primary admin role
CREATE OR REPLACE FUNCTION protect_admin_role_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.user_id = '9c56194a-b0f9-4878-ac57-e97371acd199' AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete the primary admin role';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Prevent deleting/banning primary admin user
CREATE OR REPLACE FUNCTION protect_admin_user()
RETURNS trigger AS $$
BEGIN
  IF OLD.id = '9c56194a-b0f9-4878-ac57-e97371acd199' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete the primary admin account';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.is_banned = true THEN
      RAISE EXCEPTION 'Cannot ban the primary admin account';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TABLES
-- =============================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  email_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  raw_user_meta_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  passport_number TEXT,
  nid_number TEXT,
  emergency_contact TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts (financial wallets)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Packages
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  duration_days INTEGER,
  start_date DATE,
  expiry_date DATE,
  features JSONB DEFAULT '[]',
  services JSONB DEFAULT '[]',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  rating NUMERIC NOT NULL DEFAULT 4.9,
  highlight_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill columns for existing deployments
ALTER TABLE packages ADD COLUMN IF NOT EXISTS rating NUMERIC NOT NULL DEFAULT 4.9;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS highlight_tag TEXT;

-- Installment plans
CREATE TABLE IF NOT EXISTS installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  num_installments INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moallems (agents)
CREATE TABLE IF NOT EXISTS moallems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  nid_number TEXT,
  contract_date DATE,
  contracted_hajji INTEGER NOT NULL DEFAULT 0,
  contracted_amount NUMERIC NOT NULL DEFAULT 0,
  total_deposit NUMERIC NOT NULL DEFAULT 0,
  total_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier agents
CREATE TABLE IF NOT EXISTS supplier_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  address TEXT,
  contract_date DATE,
  contracted_hajji INTEGER NOT NULL DEFAULT 0,
  contracted_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  package_id UUID NOT NULL REFERENCES packages(id),
  moallem_id UUID REFERENCES moallems(id),
  supplier_agent_id UUID REFERENCES supplier_agents(id),
  installment_plan_id UUID REFERENCES installment_plans(id),
  tracking_id TEXT NOT NULL DEFAULT ('TT-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  booking_type TEXT NOT NULL DEFAULT 'individual',
  num_travelers INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  selling_price_per_person NUMERIC DEFAULT 0,
  cost_price_per_person NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  profit_amount NUMERIC DEFAULT 0,
  extra_expense NUMERIC DEFAULT 0,
  commission_per_person NUMERIC NOT NULL DEFAULT 0,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  commission_paid NUMERIC NOT NULL DEFAULT 0,
  commission_due NUMERIC NOT NULL DEFAULT 0,
  moallem_due NUMERIC NOT NULL DEFAULT 0,
  paid_by_moallem NUMERIC NOT NULL DEFAULT 0,
  supplier_due NUMERIC NOT NULL DEFAULT 0,
  paid_to_supplier NUMERIC NOT NULL DEFAULT 0,
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  guest_passport TEXT,
  guest_address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking members (for family bookings)
CREATE TABLE IF NOT EXISTS booking_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id),
  full_name TEXT NOT NULL,
  passport_number TEXT,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL,
  customer_id UUID,
  amount NUMERIC NOT NULL,
  installment_number INTEGER,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT DEFAULT 'manual',
  wallet_account_id UUID REFERENCES accounts(id),
  receipt_file_path TEXT,
  transaction_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  expense_type TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID,
  package_id UUID REFERENCES packages(id),
  wallet_account_id UUID REFERENCES accounts(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions (master ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'other',
  source_id UUID,
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  payment_method TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial summary
CREATE TABLE IF NOT EXISTS financial_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_income NUMERIC NOT NULL DEFAULT 0,
  total_expense NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moallem payments
CREATE TABLE IF NOT EXISTS moallem_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moallem_id UUID NOT NULL REFERENCES moallems(id),
  booking_id UUID REFERENCES bookings(id),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  wallet_account_id UUID REFERENCES accounts(id),
  receipt_file_path TEXT,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moallem commission payments
CREATE TABLE IF NOT EXISTS moallem_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moallem_id UUID NOT NULL REFERENCES moallems(id),
  booking_id UUID REFERENCES bookings(id),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  wallet_account_id UUID REFERENCES accounts(id),
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier agent payments
CREATE TABLE IF NOT EXISTS supplier_agent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_agent_id UUID NOT NULL REFERENCES supplier_agents(id),
  booking_id UUID REFERENCES bookings(id),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  wallet_account_id UUID REFERENCES accounts(id),
  receipt_file_path TEXT,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier contracts
CREATE TABLE IF NOT EXISTS supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES supplier_agents(id),
  pilgrim_count INTEGER NOT NULL DEFAULT 0,
  contract_amount NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  total_due NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier contract payments
CREATE TABLE IF NOT EXISTS supplier_contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES supplier_contracts(id),
  supplier_id UUID NOT NULL REFERENCES supplier_agents(id),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  wallet_account_id UUID REFERENCES accounts(id),
  created_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hotels
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Makkah',
  description TEXT,
  image_url TEXT,
  gallery JSONB DEFAULT '[]',
  amenities JSONB DEFAULT '[]',
  star_rating INTEGER,
  distance_to_haram TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hotel rooms
CREATE TABLE IF NOT EXISTS hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 2,
  price_per_night NUMERIC NOT NULL,
  image_url TEXT,
  amenities JSONB DEFAULT '[]',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hotel bookings
CREATE TABLE IF NOT EXISTS hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  room_id UUID NOT NULL REFERENCES hotel_rooms(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking documents
CREATE TABLE IF NOT EXISTS booking_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Site content (CMS)
CREATE TABLE IF NOT EXISTS site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CMS versions
CREATE TABLE IF NOT EXISTS cms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  updated_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  image_url TEXT,
  author_id UUID,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  payment_id UUID REFERENCES payments(id),
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_detail TEXT,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  event_label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OTP codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session tokens (for JWT refresh)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- VIEWS
-- =============================================

CREATE OR REPLACE VIEW v_booking_profit AS
SELECT
  b.id AS booking_id,
  b.tracking_id,
  b.guest_name,
  b.status,
  b.num_travelers,
  b.total_amount,
  b.paid_amount,
  b.due_amount,
  b.selling_price_per_person,
  b.cost_price_per_person,
  b.total_cost,
  b.extra_expense,
  b.profit_amount,
  b.total_commission,
  b.commission_paid,
  b.commission_due,
  b.commission_per_person,
  b.moallem_id,
  b.moallem_due,
  b.paid_by_moallem,
  b.supplier_due,
  b.paid_to_supplier,
  b.package_id,
  p.name AS package_name,
  p.type AS package_type,
  COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id = b.id AND status = 'completed'), 0) AS total_payments,
  COALESCE((SELECT SUM(amount) FROM expenses WHERE booking_id = b.id), 0) AS total_expenses
FROM bookings b
LEFT JOIN packages p ON b.package_id = p.id;

CREATE OR REPLACE VIEW v_customer_profit AS
SELECT
  pr.id AS customer_id,
  pr.full_name,
  pr.phone,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'completed'), 0) AS total_payments,
  COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.customer_id = pr.id), 0) AS total_expenses,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'completed'), 0) -
    COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.customer_id = pr.id), 0) AS profit
FROM profiles pr
LEFT JOIN bookings b ON b.user_id = pr.user_id
LEFT JOIN payments pay ON pay.booking_id = b.id
GROUP BY pr.id, pr.full_name, pr.phone;

CREATE OR REPLACE VIEW v_package_profit AS
SELECT
  p.id AS package_id,
  p.name AS package_name,
  p.type AS package_type,
  p.price AS package_price,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(b.total_amount), 0) AS total_revenue,
  COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.package_id = p.id), 0) AS total_expenses,
  COALESCE(SUM(b.total_amount), 0) -
    COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.package_id = p.id), 0) AS profit
FROM packages p
LEFT JOIN bookings b ON b.package_id = p.id
GROUP BY p.id, p.name, p.type, p.price;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Calculate booking profit (trigger function)
CREATE OR REPLACE FUNCTION calculate_booking_profit()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.booking_type, 'individual') = 'individual' THEN
    NEW.total_amount := COALESCE(NEW.selling_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  END IF;
  NEW.total_cost := COALESCE(NEW.cost_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.total_commission := COALESCE(NEW.commission_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.commission_due := GREATEST(0, COALESCE(NEW.total_commission, 0) - COALESCE(NEW.commission_paid, 0));
  NEW.profit_amount := NEW.total_amount - COALESCE(NEW.total_cost, 0) - COALESCE(NEW.total_commission, 0) - COALESCE(NEW.extra_expense, 0);
  NEW.due_amount := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_amount, 0));
  NEW.supplier_due := GREATEST(0, COALESCE(NEW.total_cost, 0) - COALESCE(NEW.paid_to_supplier, 0));
  IF NEW.moallem_id IS NOT NULL THEN
    NEW.moallem_due := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_by_moallem, 0));
  ELSE
    NEW.moallem_due := 0;
    NEW.commission_per_person := 0;
    NEW.total_commission := 0;
    NEW.commission_paid := 0;
    NEW.commission_due := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update booking paid amount
CREATE OR REPLACE FUNCTION update_booking_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
    AND status = 'completed';

  SELECT total_amount INTO v_total_amount
  FROM bookings
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  v_total_paid := GREATEST(0, LEAST(v_total_paid, v_total_amount));

  UPDATE bookings
  SET paid_amount = v_total_paid,
      due_amount = GREATEST(0, v_total_amount - v_total_paid),
      status = CASE WHEN v_total_paid >= v_total_amount THEN 'completed' ELSE status END
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update moallem on booking change
CREATE OR REPLACE FUNCTION update_moallem_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_total_amount NUMERIC;
  v_total_paid NUMERIC;
  v_moallem_id UUID;
BEGIN
  v_moallem_id := COALESCE(NEW.moallem_id, OLD.moallem_id);
  IF v_moallem_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'UPDATE' AND OLD.moallem_id IS NOT NULL AND OLD.moallem_id IS DISTINCT FROM NEW.moallem_id THEN
    SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0)
    INTO v_total_amount, v_total_paid
    FROM bookings WHERE moallem_id = OLD.moallem_id;
    UPDATE moallems SET total_due = GREATEST(0, v_total_amount - v_total_paid), updated_at = now()
    WHERE id = OLD.moallem_id;
  END IF;

  SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0)
  INTO v_total_amount, v_total_paid
  FROM bookings WHERE moallem_id = v_moallem_id;
  UPDATE moallems SET total_due = GREATEST(0, v_total_amount - v_total_paid), updated_at = now()
  WHERE id = v_moallem_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update moallem on deposit
CREATE OR REPLACE FUNCTION update_moallem_on_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_total_deposit NUMERIC;
  v_total_amount NUMERIC;
  v_total_paid NUMERIC;
  v_moallem_id UUID;
BEGIN
  v_moallem_id := COALESCE(NEW.moallem_id, OLD.moallem_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposit
  FROM moallem_payments WHERE moallem_id = v_moallem_id;
  SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0)
  INTO v_total_amount, v_total_paid
  FROM bookings WHERE moallem_id = v_moallem_id;
  UPDATE moallems SET
    total_deposit = v_total_deposit,
    total_due = GREATEST(0, v_total_amount - v_total_paid),
    updated_at = now()
  WHERE id = v_moallem_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update booking supplier paid
CREATE OR REPLACE FUNCTION update_booking_supplier_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id UUID;
  v_total_paid NUMERIC;
  v_total_cost NUMERIC;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  IF v_booking_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM supplier_agent_payments WHERE booking_id = v_booking_id;
  SELECT COALESCE(total_cost, 0) INTO v_total_cost
  FROM bookings WHERE id = v_booking_id;
  UPDATE bookings SET paid_to_supplier = v_total_paid, supplier_due = GREATEST(0, v_total_cost - v_total_paid)
  WHERE id = v_booking_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update booking moallem paid
CREATE OR REPLACE FUNCTION update_booking_moallem_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id UUID;
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  IF v_booking_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM moallem_payments WHERE booking_id = v_booking_id;
  SELECT COALESCE(total_amount, 0) INTO v_total_amount
  FROM bookings WHERE id = v_booking_id;
  UPDATE bookings SET paid_by_moallem = v_total_paid, moallem_due = GREATEST(0, v_total_amount - v_total_paid)
  WHERE id = v_booking_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update booking commission paid
CREATE OR REPLACE FUNCTION update_booking_commission_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id UUID;
  v_total_paid NUMERIC;
  v_total_commission NUMERIC;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  IF v_booking_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM moallem_commission_payments WHERE booking_id = v_booking_id;
  SELECT COALESCE(total_commission, 0) INTO v_total_commission
  FROM bookings WHERE id = v_booking_id;
  UPDATE bookings SET commission_paid = v_total_paid, commission_due = GREATEST(0, v_total_commission - v_total_paid)
  WHERE id = v_booking_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- On payment completed - create transaction
CREATE OR REPLACE FUNCTION on_payment_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_booking RECORD;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'completed') THEN
    SELECT id, tracking_id, package_id, user_id INTO v_booking FROM bookings WHERE id = NEW.booking_id;
    INSERT INTO transactions (type, category, amount, debit, credit, source_type, source_id, booking_id, user_id, date, note, payment_method, customer_id, reference)
    VALUES ('income', 'payment', NEW.amount, NEW.amount, 0, 'customer', NEW.customer_id, NEW.booking_id,
      COALESCE(NEW.user_id, v_booking.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      CURRENT_DATE, 'Payment #' || COALESCE(NEW.installment_number::text, 'N/A') || ' for ' || COALESCE(v_booking.tracking_id, ''),
      NEW.payment_method, NEW.customer_id, NEW.id::text);

    UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE type = 'income' AND name = 'Revenue';
    IF NOT FOUND THEN INSERT INTO accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount); END IF;

    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;

    -- Update financial summary
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO v_total_income, v_total_expense FROM transactions;
    SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM expenses;
    v_total_expense := v_total_expense + v_expense_total;
    IF EXISTS (SELECT 1 FROM financial_summary LIMIT 1) THEN
      UPDATE financial_summary SET total_income = v_total_income, total_expense = v_total_expense, net_profit = v_total_income - v_total_expense, updated_at = now();
    ELSE
      INSERT INTO financial_summary (total_income, total_expense, net_profit) VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
    END IF;
  END IF;

  -- Handle reversal
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    DELETE FROM transactions WHERE reference = OLD.id::text AND type = 'income';
    UPDATE accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now() WHERE type = 'income' AND name = 'Revenue';
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now() WHERE id = OLD.wallet_account_id;
    END IF;
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO v_total_income, v_total_expense FROM transactions;
    SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM expenses;
    v_total_expense := v_total_expense + v_expense_total;
    UPDATE financial_summary SET total_income = v_total_income, total_expense = v_total_expense, net_profit = v_total_income - v_total_expense, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- On expense changed
CREATE OR REPLACE FUNCTION on_expense_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
  v_wallet_balance NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.wallet_account_id IS NOT NULL THEN UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id; END IF;
    IF NEW.wallet_account_id IS NOT NULL THEN
      SELECT balance INTO v_wallet_balance FROM accounts WHERE id = NEW.wallet_account_id;
      IF v_wallet_balance < NEW.amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
      UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM expenses;
  UPDATE accounts SET balance = v_expense_total, updated_at = now() WHERE type = 'expense' AND name = 'Operating Expenses';
  IF NOT FOUND THEN INSERT INTO accounts (name, type, balance) VALUES ('Operating Expenses', 'expense', v_expense_total); END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO v_total_income, v_total_expense FROM transactions;
  v_total_expense := v_total_expense + v_expense_total;
  IF EXISTS (SELECT 1 FROM financial_summary LIMIT 1) THEN
    UPDATE financial_summary SET total_expense = v_total_expense, total_income = v_total_income, net_profit = v_total_income - v_total_expense, updated_at = now();
  ELSE
    INSERT INTO financial_summary (total_income, total_expense, net_profit) VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- On moallem payment income
CREATE OR REPLACE FUNCTION on_moallem_payment_income()
RETURNS TRIGGER AS $$
DECLARE
  v_moallem_name TEXT;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  SELECT name INTO v_moallem_name FROM moallems WHERE id = COALESCE(NEW.moallem_id, OLD.moallem_id);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference, booking_id)
    VALUES ('income', 'moallem_payment', NEW.amount, NEW.amount, 0, 'moallem', NEW.moallem_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Moallem payment from ' || COALESCE(v_moallem_name, 'Unknown'), NEW.payment_method, NEW.id::text, NEW.booking_id);
    UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE type = 'income' AND name = 'Revenue';
    IF NOT FOUND THEN INSERT INTO accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount); END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM transactions WHERE reference = OLD.id::text AND type = 'income' AND category = 'moallem_payment';
    UPDATE accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now() WHERE type = 'income' AND name = 'Revenue';
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO v_total_income, v_total_expense FROM transactions;
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM expenses;
  v_total_expense := v_total_expense + v_expense_total;
  IF EXISTS (SELECT 1 FROM financial_summary LIMIT 1) THEN
    UPDATE financial_summary SET total_income = v_total_income, total_expense = v_total_expense, net_profit = v_total_income - v_total_expense, updated_at = now();
  ELSE
    INSERT INTO financial_summary (total_income, total_expense, net_profit) VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- On moallem payment wallet
CREATE OR REPLACE FUNCTION on_moallem_payment_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance - OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- On supplier payment changed
CREATE OR REPLACE FUNCTION on_supplier_payment_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_name TEXT;
  v_wallet_balance NUMERIC;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;

  SELECT agent_name INTO v_agent_name FROM supplier_agents WHERE id = COALESCE(NEW.supplier_agent_id, OLD.supplier_agent_id);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'supplier_payment', NEW.amount, 0, NEW.amount, 'supplier', NEW.supplier_agent_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Supplier payment to ' || COALESCE(v_agent_name, 'Unknown'), NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'supplier_payment';
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO v_total_income, v_total_expense FROM transactions;
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM expenses;
  v_total_expense := v_total_expense + v_expense_total;
  IF EXISTS (SELECT 1 FROM financial_summary LIMIT 1) THEN
    UPDATE financial_summary SET total_income = v_total_income, total_expense = v_total_expense, net_profit = v_total_income - v_total_expense, updated_at = now();
  ELSE
    INSERT INTO financial_summary (total_income, total_expense, net_profit) VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- On commission payment changed
CREATE OR REPLACE FUNCTION on_commission_payment_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_moallem_name TEXT;
  v_wallet_balance NUMERIC;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;

  SELECT name INTO v_moallem_name FROM moallems WHERE id = COALESCE(NEW.moallem_id, OLD.moallem_id);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'commission_payment', NEW.amount, 0, NEW.amount, 'commission', NEW.moallem_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Commission payment to ' || COALESCE(v_moallem_name, 'Unknown'), NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'commission_payment';
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO v_total_income, v_total_expense FROM transactions;
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM expenses;
  v_total_expense := v_total_expense + v_expense_total;
  IF EXISTS (SELECT 1 FROM financial_summary LIMIT 1) THEN
    UPDATE financial_summary SET total_income = v_total_income, total_expense = v_total_expense, net_profit = v_total_income - v_total_expense, updated_at = now();
  ELSE
    INSERT INTO financial_summary (total_income, total_expense, net_profit) VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- On supplier contract payment
CREATE OR REPLACE FUNCTION on_supplier_contract_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_supplier_name TEXT;
  v_wallet_balance NUMERIC;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM supplier_contract_payments WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id);

  UPDATE supplier_contracts SET total_paid = v_total_paid, total_due = GREATEST(0, contract_amount - v_total_paid)
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);

  SELECT agent_name INTO v_supplier_name FROM supplier_agents WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'supplier_contract_payment', NEW.amount, 0, NEW.amount, 'supplier', NEW.supplier_id,
      COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.payment_date, 'Supplier contract payment to ' || COALESCE(v_supplier_name, 'Unknown'), NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'supplier_contract_payment';
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO v_total_income, v_total_expense FROM transactions;
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM expenses;
  v_total_expense := v_total_expense + v_expense_total;
  IF EXISTS (SELECT 1 FROM financial_summary LIMIT 1) THEN
    UPDATE financial_summary SET total_income = v_total_income, total_expense = v_total_expense, net_profit = v_total_income - v_total_expense, updated_at = now();
  ELSE
    INSERT INTO financial_summary (total_income, total_expense, net_profit) VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Check package expiry
CREATE OR REPLACE FUNCTION check_package_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
    NEW.status := 'inactive';
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deactivate expired packages
CREATE OR REPLACE FUNCTION deactivate_expired_packages()
RETURNS void AS $$
BEGIN
  UPDATE packages SET status = 'inactive', is_active = false
  WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Generate installment schedule
CREATE OR REPLACE FUNCTION generate_installment_schedule(p_booking_id UUID, p_total_amount NUMERIC, p_num_installments INTEGER, p_user_id UUID)
RETURNS void AS $$
DECLARE
  installment_amount NUMERIC;
  i INTEGER;
BEGIN
  installment_amount := ROUND(p_total_amount / p_num_installments, 2);
  FOR i IN 1..p_num_installments LOOP
    INSERT INTO payments (booking_id, user_id, amount, installment_number, due_date, status)
    VALUES (p_booking_id, p_user_id,
      CASE WHEN i = p_num_installments THEN p_total_amount - (installment_amount * (p_num_installments - 1)) ELSE installment_amount END,
      i, CURRENT_DATE + (i * 30), 'pending');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Has role helper
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
$$ LANGUAGE sql STABLE;

-- Protect admin role deletion
CREATE OR REPLACE FUNCTION protect_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'admin' AND (SELECT COUNT(*) FROM user_roles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last admin role';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER trg_calculate_booking_profit
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_booking_profit();

CREATE TRIGGER trg_update_booking_paid
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_booking_paid_amount();

CREATE TRIGGER trg_on_payment_completed
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION on_payment_completed();

CREATE TRIGGER trg_update_moallem_on_booking
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_moallem_on_booking();

CREATE TRIGGER trg_update_moallem_on_deposit
  AFTER INSERT OR UPDATE OR DELETE ON moallem_payments
  FOR EACH ROW EXECUTE FUNCTION update_moallem_on_deposit();

CREATE TRIGGER trg_on_moallem_payment_income
  AFTER INSERT OR UPDATE OR DELETE ON moallem_payments
  FOR EACH ROW EXECUTE FUNCTION on_moallem_payment_income();

CREATE TRIGGER trg_on_moallem_payment_wallet
  AFTER INSERT OR DELETE ON moallem_payments
  FOR EACH ROW EXECUTE FUNCTION on_moallem_payment_wallet();

CREATE TRIGGER trg_update_booking_moallem_paid
  AFTER INSERT OR UPDATE OR DELETE ON moallem_payments
  FOR EACH ROW EXECUTE FUNCTION update_booking_moallem_paid();

CREATE TRIGGER trg_update_booking_supplier_paid
  AFTER INSERT OR UPDATE OR DELETE ON supplier_agent_payments
  FOR EACH ROW EXECUTE FUNCTION update_booking_supplier_paid();

CREATE TRIGGER trg_on_supplier_payment_changed
  AFTER INSERT OR UPDATE OR DELETE ON supplier_agent_payments
  FOR EACH ROW EXECUTE FUNCTION on_supplier_payment_changed();

CREATE TRIGGER trg_update_booking_commission_paid
  AFTER INSERT OR UPDATE OR DELETE ON moallem_commission_payments
  FOR EACH ROW EXECUTE FUNCTION update_booking_commission_paid();

CREATE TRIGGER trg_on_commission_payment_changed
  AFTER INSERT OR UPDATE OR DELETE ON moallem_commission_payments
  FOR EACH ROW EXECUTE FUNCTION on_commission_payment_changed();

CREATE TRIGGER trg_on_expense_changed
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION on_expense_changed();

CREATE TRIGGER trg_on_supplier_contract_payment
  AFTER INSERT OR DELETE ON supplier_contract_payments
  FOR EACH ROW EXECUTE FUNCTION on_supplier_contract_payment();

CREATE TRIGGER trg_check_package_expiry
  BEFORE INSERT OR UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION check_package_expiry();

-- Updated at triggers
CREATE TRIGGER trg_updated_at_bookings BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_updated_at_packages BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_updated_at_hotels BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_updated_at_moallems BEFORE UPDATE ON moallems FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_updated_at_supplier_agents BEFORE UPDATE ON supplier_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_updated_at_accounts BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_protect_admin_role BEFORE DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION protect_admin_role();

-- =============================================
-- SEED DATA - Default admin user
-- Password: Admin@123456 (bcrypt hash)
-- =============================================
INSERT INTO users (id, email, password_hash, full_name, email_verified)
VALUES ('9c56194a-b0f9-4878-ac57-e97371acd199', 'admin@rahekaba.com',
  '$2b$10$K7L1OJ45HZiPR6vL1XJZFuFGx3Hx8V8Z.WGNwqJ3JHkDzMiYaFYK',
  'System Admin', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
VALUES ('9c56194a-b0f9-4878-ac57-e97371acd199', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Default financial summary
INSERT INTO financial_summary (total_income, total_expense, net_profit)
SELECT 0, 0, 0 WHERE NOT EXISTS (SELECT 1 FROM financial_summary);

-- Default notification settings
INSERT INTO notification_settings (event_key, event_label) VALUES
  ('booking_created', 'Booking Created'),
  ('booking_confirmed', 'Booking Confirmed'),
  ('booking_completed', 'Booking Completed'),
  ('payment_received', 'Payment Received'),
  ('payment_reminder', 'Payment Reminder'),
  ('commission_paid', 'Commission Paid'),
  ('supplier_payment_recorded', 'Supplier Payment Recorded')
ON CONFLICT DO NOTHING;

-- =============================================
-- BILINGUAL MESSAGE TEMPLATES (Phase 4)
-- =============================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  channel TEXT NOT NULL,                -- 'email' | 'sms' | 'whatsapp'
  language TEXT NOT NULL DEFAULT 'en',  -- 'en' | 'ar' | 'bn'
  subject TEXT,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_key, channel, language)
);

INSERT INTO message_templates (event_key, channel, language, subject, body) VALUES
  ('booking_confirmed','email','en','Your Umrah Booking is Confirmed — {{tracking_id}}','Dear {{name}},\n\nYour Umrah booking ({{tracking_id}}) has been confirmed. Travel date: {{travel_date}}.\n\n— Tuba Al Hijaz Travel & Tourism'),
  ('booking_confirmed','email','ar','تم تأكيد حجز العمرة — {{tracking_id}}','عزيزي {{name}}،\n\nتم تأكيد حجز العمرة الخاص بك ({{tracking_id}}). تاريخ السفر: {{travel_date}}.\n\n— طوبى الحجاز للسفر والسياحة'),
  ('booking_confirmed','email','bn','আপনার ওমরাহ বুকিং নিশ্চিত হয়েছে — {{tracking_id}}','প্রিয় {{name}},\n\nআপনার ওমরাহ বুকিং ({{tracking_id}}) নিশ্চিত হয়েছে। ভ্রমণের তারিখ: {{travel_date}}।\n\n— তুবা আল হিজাজ ট্রাভেল ও ট্যুরিজম'),
  ('booking_confirmed','sms','en',NULL,'Tuba Al Hijaz: Booking {{tracking_id}} confirmed. Travel: {{travel_date}}.'),
  ('booking_confirmed','sms','ar',NULL,'طوبى الحجاز: تم تأكيد الحجز {{tracking_id}}. السفر: {{travel_date}}.'),
  ('booking_confirmed','sms','bn',NULL,'তুবা আল হিজাজ: বুকিং {{tracking_id}} নিশ্চিত। ভ্রমণ: {{travel_date}}।'),
  ('payment_received','email','en','Payment Received — {{amount}} BDT','Dear {{name}},\n\nWe have received your payment of {{amount}} BDT for booking {{tracking_id}}. Balance due: {{due}} BDT.\n\nThank you.'),
  ('payment_received','email','ar','تم استلام الدفعة — {{amount}} تاكا','عزيزي {{name}}،\n\nاستلمنا دفعتك بمبلغ {{amount}} تاكا للحجز {{tracking_id}}. الرصيد المستحق: {{due}} تاكا.'),
  ('payment_received','sms','en',NULL,'Tuba Al Hijaz: Received {{amount}} BDT for {{tracking_id}}. Due: {{due}} BDT.'),
  ('payment_received','sms','bn',NULL,'তুবা আল হিজাজ: {{tracking_id}}-এর জন্য {{amount}} টাকা পেয়েছি। বাকি: {{due}} টাকা।'),
  ('payment_reminder','sms','en',NULL,'Tuba Al Hijaz: Friendly reminder — {{due}} BDT due on {{due_date}} for {{tracking_id}}.'),
  ('payment_reminder','sms','bn',NULL,'তুবা আল হিজাজ: {{tracking_id}}-এর জন্য {{due_date}} তারিখে {{due}} টাকা বাকি।'),
  ('visa_approved','email','en','Visa Approved — {{tracking_id}}','Dear {{name}},\n\nGood news! Your Saudi visa has been approved. Please prepare for travel on {{travel_date}}.'),
  ('visa_approved','email','ar','تمت الموافقة على التأشيرة — {{tracking_id}}','عزيزي {{name}}،\n\nنبشّرك بالموافقة على تأشيرتك السعودية. يرجى الاستعداد للسفر بتاريخ {{travel_date}}.'),
  ('visa_approved','sms','en',NULL,'Tuba Al Hijaz: Visa APPROVED for {{name}} ({{tracking_id}}). Travel: {{travel_date}}.')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_message_templates_event ON message_templates(event_key, channel, language);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_moallem_id ON bookings(moallem_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_id ON bookings(tracking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_expenses_booking_id ON expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_moallem_payments_moallem_id ON moallem_payments(moallem_id);
CREATE INDEX IF NOT EXISTS idx_supplier_agent_payments_supplier_id ON supplier_agent_payments(supplier_agent_id);
CREATE INDEX IF NOT EXISTS idx_site_content_section_key ON site_content(section_key);

-- =============================================
-- DAILY CASHBOOK TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS daily_cashbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other',
  wallet_account_id UUID REFERENCES accounts(id),
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_cashbook_date ON daily_cashbook(date);
CREATE INDEX IF NOT EXISTS idx_daily_cashbook_type ON daily_cashbook(type);

-- Moallem service items
CREATE TABLE IF NOT EXISTS moallem_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moallem_id UUID NOT NULL REFERENCES moallems(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moallem_items_moallem_id ON moallem_items(moallem_id);

-- Supplier agent service items
CREATE TABLE IF NOT EXISTS supplier_agent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_agent_id UUID NOT NULL REFERENCES supplier_agents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_agent_items_supplier_id ON supplier_agent_items(supplier_agent_id);

-- =============================================
-- CANCELLATION POLICIES & REFUNDS
-- =============================================
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  refund_type TEXT NOT NULL DEFAULT 'percentage' CHECK (refund_type IN ('percentage', 'flat')),
  refund_value NUMERIC NOT NULL DEFAULT 0,
  min_days_before_departure INTEGER DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES cancellation_policies(id),
  original_amount NUMERIC NOT NULL DEFAULT 0,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  deduction_amount NUMERIC NOT NULL DEFAULT 0,
  refund_method TEXT DEFAULT 'cash',
  wallet_account_id UUID REFERENCES accounts(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- ===================== AUDIT LOGS =====================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  method TEXT,
  path TEXT,
  status_code INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  changes JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ===================== ADMIN 2FA =====================
CREATE TABLE IF NOT EXISTS admin_2fa (
  user_id UUID PRIMARY KEY,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_phone TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  totp_secret TEXT,
  totp_secret_pending TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_2fa_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_codes_user ON admin_2fa_codes(user_id, created_at DESC);

-- Online Payment Sessions (SSLCommerz)
CREATE TABLE IF NOT EXISTS online_payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tran_id TEXT NOT NULL UNIQUE,
  booking_id UUID REFERENCES bookings(id),
  user_id UUID,
  customer_phone TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'initiated',
  gateway TEXT NOT NULL DEFAULT 'sslcommerz',
  gateway_response JSONB,
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ops_booking ON online_payment_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ops_status ON online_payment_sessions(status);

-- ===================================================================
-- TRANSPORT VOUCHERS & INTERNAL MOVEMENTS (Phase 2)
-- ===================================================================
CREATE TABLE IF NOT EXISTS transport_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no TEXT NOT NULL UNIQUE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Agent
  agent_name TEXT,
  agent_country TEXT,
  umrah_company TEXT,
  group_name TEXT,

  -- Hotels
  makkah_hotel TEXT,
  madinah_hotel TEXT,
  agreement_number TEXT,
  check_in_date DATE,
  check_out_date DATE,
  nights INTEGER,
  total_rooms INTEGER,

  -- Transport
  transport_company TEXT,
  vehicle_type TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  num_pilgrims INTEGER NOT NULL DEFAULT 0,

  -- Flight
  arrival_flight TEXT,
  departure_flight TEXT,
  airline TEXT,
  flight_number TEXT,
  airport TEXT,
  flight_date DATE,
  flight_time TEXT,

  -- Supervisors
  makkah_supervisor TEXT,
  madinah_supervisor TEXT,
  ops_24h_phone TEXT,

  -- Meta
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  language TEXT NOT NULL DEFAULT 'en',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transport_vouchers_booking ON transport_vouchers(booking_id);
CREATE INDEX IF NOT EXISTS idx_transport_vouchers_status ON transport_vouchers(status);

CREATE TABLE IF NOT EXISTS movement_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES transport_vouchers(id) ON DELETE CASCADE,
  serial_no INTEGER NOT NULL DEFAULT 1,
  movement_date DATE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  movement_time TEXT,
  vehicle TEXT,
  driver TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | in_progress | completed | cancelled
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movement_schedules_voucher ON movement_schedules(voucher_id);
CREATE INDEX IF NOT EXISTS idx_movement_schedules_date ON movement_schedules(movement_date);

-- =============================================================
-- PHASE 6 SLICE D — MESSAGING ENGINE (notifications + queues + logs)
-- =============================================================

-- Generic in-app notification center
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                       -- target admin user (null = broadcast to all admins)
  event_type TEXT NOT NULL,           -- booking_created, payment_received, visa_approved, ...
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                          -- deep-link inside admin (e.g. /admin/bookings/<id>)
  severity TEXT NOT NULL DEFAULT 'info', -- info | success | warning | error
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Generic outbound message queue + log used for whatsapp / sms / email
CREATE TABLE IF NOT EXISTS message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,              -- whatsapp | sms | email
  language TEXT NOT NULL DEFAULT 'en',
  recipient TEXT NOT NULL,            -- phone or email
  recipient_name TEXT,
  subject TEXT,                       -- email only
  body TEXT NOT NULL,
  event_key TEXT,                     -- ties back to message_templates
  related_type TEXT,                  -- booking | payment | visa | invoice | manual
  related_id UUID,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sending | sent | failed | cancelled
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  provider_message_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_queue_status_next ON message_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_message_queue_channel ON message_queue(channel);
CREATE INDEX IF NOT EXISTS idx_message_queue_related ON message_queue(related_type, related_id);

CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  event_key TEXT,
  related_type TEXT,
  related_id UUID,
  status TEXT NOT NULL,               -- sent | failed
  provider_message_id TEXT,
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_logs_channel ON message_logs(channel);
CREATE INDEX IF NOT EXISTS idx_message_logs_created ON message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_related ON message_logs(related_type, related_id);


-- =============================================================
-- PHASE 6 SLICE B — QR VERIFICATION + PUBLIC TRACKING
-- =============================================================

-- QR verification tokens for invoices/vouchers/manifests/bookings
CREATE TABLE IF NOT EXISTS qr_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,           -- short random token used in QR URL
  document_type TEXT NOT NULL,          -- invoice | voucher | manifest | booking
  related_type TEXT NOT NULL,           -- booking | voucher | manifest
  related_id UUID NOT NULL,
  tracking_id TEXT,                     -- snapshot of booking tracking_id when applicable
  status TEXT NOT NULL DEFAULT 'active',-- active | revoked
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_related ON qr_verifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_tracking ON qr_verifications(tracking_id);

-- Public scan / verification activity log (for fraud monitoring)
CREATE TABLE IF NOT EXISTS public_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID REFERENCES qr_verifications(id) ON DELETE SET NULL,
  tracking_id TEXT,
  document_type TEXT,
  scan_result TEXT NOT NULL DEFAULT 'verified', -- verified | invalid | revoked | expired
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_tracking_logs_qr ON public_tracking_logs(qr_id);
CREATE INDEX IF NOT EXISTS idx_public_tracking_logs_scanned ON public_tracking_logs(scanned_at DESC);

-- Document verification workflow on uploaded passenger documents
ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Auto-create QR token when a booking is created
CREATE OR REPLACE FUNCTION public.auto_create_booking_qr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(12), 'hex');
  INSERT INTO qr_verifications (token, document_type, related_type, related_id, tracking_id, created_by)
  VALUES (v_token, 'booking', 'booking', NEW.id, NEW.tracking_id, NEW.user_id)
  ON CONFLICT (token) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_booking_qr ON bookings;
CREATE TRIGGER trg_auto_create_booking_qr
AFTER INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION public.auto_create_booking_qr();

-- ===================== RBAC EXPANSION (Phase 6 Slice C) =====================
-- Expand role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='super_admin' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='operations_manager' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'operations_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='visa_officer' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'visa_officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='transport_manager' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'transport_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='catering_manager' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'catering_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='finance_manager' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'finance_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='hotel_coordinator' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'hotel_coordinator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='airport_coordinator' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'airport_coordinator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='driver' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'driver';
  END IF;
END $$;

-- Permission catalog: defines every grantable capability
CREATE TABLE IF NOT EXISTS permissions (
  key TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role -> permission mapping (with optional scope)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'all', -- own | department | all
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_role_perm_role ON role_permissions(role);

-- Per-user permission overrides
CREATE TABLE IF NOT EXISTS permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  scope TEXT NOT NULL DEFAULT 'all',
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);

-- Enrich sessions table with device tracking
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_label TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, revoked_at);

-- Approval workflows
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- refund | payment_edit | visa_rejection | booking_cancel | commission_payout
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  requested_by UUID,
  requested_by_email TEXT,
  reviewed_by UUID,
  reviewed_by_email TEXT,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(type);

-- Add severity to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- Seed permission catalog
INSERT INTO permissions (key, module, label, description) VALUES
  ('bookings.view',         'bookings',     'View bookings',         'Read access to bookings'),
  ('bookings.create',       'bookings',     'Create bookings',       NULL),
  ('bookings.edit',         'bookings',     'Edit bookings',         NULL),
  ('bookings.delete',       'bookings',     'Delete bookings',       NULL),
  ('bookings.approve',      'bookings',     'Approve bookings',      NULL),
  ('bookings.export',       'bookings',     'Export bookings',       NULL),
  ('payments.view',         'finance',      'View payments',         NULL),
  ('payments.create',       'finance',      'Record payments',       NULL),
  ('payments.edit',         'finance',      'Edit payments',         NULL),
  ('payments.refund',       'finance',      'Issue refunds',         NULL),
  ('finance.full',          'finance',      'Full financial access', 'Accounting, ledgers, P&L'),
  ('visa.view',             'visa',         'View visa pipeline',    NULL),
  ('visa.update',           'visa',         'Update visa status',    NULL),
  ('visa.approve',          'visa',         'Approve / reject visa', NULL),
  ('transport.view',        'transport',    'View transport',        NULL),
  ('transport.assign',      'transport',    'Assign drivers',        NULL),
  ('catering.view',         'catering',     'View catering',         NULL),
  ('catering.manage',       'catering',     'Manage catering',       NULL),
  ('hotel.view',            'hotel',        'View hotels',           NULL),
  ('hotel.manage',          'hotel',        'Manage hotels',         NULL),
  ('documents.view',        'documents',    'View documents',        NULL),
  ('documents.review',      'documents',    'Review documents',      NULL),
  ('messaging.send',        'messaging',    'Send messages',         NULL),
  ('messaging.templates',   'messaging',    'Manage templates',      NULL),
  ('qr.verify',             'security',     'Verify QR codes',       NULL),
  ('users.manage',          'security',     'Manage users',          NULL),
  ('roles.manage',          'security',     'Manage roles',          NULL),
  ('audit.view',            'security',     'View audit logs',       NULL),
  ('approvals.review',      'security',     'Review approvals',      NULL),
  ('reports.view',          'reports',      'View reports',          NULL),
  ('reports.export',        'reports',      'Export reports',        NULL)
ON CONFLICT (key) DO NOTHING;

-- Seed default role -> permissions
DO $$
DECLARE r RECORD;
BEGIN
  -- super_admin and admin: all permissions
  FOR r IN SELECT key FROM permissions LOOP
    INSERT INTO role_permissions (role, permission_key, scope) VALUES ('super_admin', r.key, 'all')
      ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions (role, permission_key, scope) VALUES ('admin', r.key, 'all')
      ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

INSERT INTO role_permissions (role, permission_key, scope) VALUES
  ('operations_manager','bookings.view','all'),('operations_manager','bookings.edit','all'),
  ('operations_manager','transport.view','all'),('operations_manager','transport.assign','all'),
  ('operations_manager','documents.view','all'),('operations_manager','reports.view','all'),
  ('visa_officer','visa.view','all'),('visa_officer','visa.update','all'),('visa_officer','visa.approve','all'),
  ('visa_officer','documents.view','all'),('visa_officer','documents.review','all'),
  ('transport_manager','transport.view','all'),('transport_manager','transport.assign','all'),
  ('transport_manager','bookings.view','all'),
  ('catering_manager','catering.view','all'),('catering_manager','catering.manage','all'),
  ('finance_manager','payments.view','all'),('finance_manager','payments.create','all'),
  ('finance_manager','payments.edit','all'),('finance_manager','payments.refund','all'),
  ('finance_manager','finance.full','all'),('finance_manager','reports.view','all'),
  ('finance_manager','reports.export','all'),
  ('hotel_coordinator','hotel.view','all'),('hotel_coordinator','hotel.manage','all'),
  ('airport_coordinator','transport.view','all'),('airport_coordinator','qr.verify','all'),
  ('driver','transport.view','own'),('driver','qr.verify','all'),
  ('accountant','payments.view','all'),('accountant','payments.create','all'),
  ('accountant','finance.full','all'),('accountant','reports.view','all'),
  ('booking','bookings.view','all'),('booking','bookings.create','all'),('booking','bookings.edit','all'),
  ('cms','documents.view','all'),
  ('viewer','bookings.view','all'),('viewer','reports.view','all')
ON CONFLICT DO NOTHING;

-- =============================================================
-- LIVE OPERATIONS INTELLIGENCE (Slice C)
-- =============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='airport_coordinator' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'airport_coordinator';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS live_vehicle_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID,
  voucher_id UUID,
  driver_user_id UUID,
  driver_name TEXT,
  vehicle_label TEXT,
  lat NUMERIC(10,6) NOT NULL,
  lng NUMERIC(10,6) NOT NULL,
  speed_kmh NUMERIC(6,2),
  heading NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'on_route',
  eta_minutes INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lvt_movement ON live_vehicle_tracking(movement_id);
CREATE INDEX IF NOT EXISTS idx_lvt_driver ON live_vehicle_tracking(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_lvt_recorded ON live_vehicle_tracking(recorded_at DESC);

CREATE TABLE IF NOT EXISTS ops_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  body TEXT,
  related_type TEXT,
  related_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ops_alerts_status ON ops_alerts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS airport_arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  voucher_id UUID,
  direction TEXT NOT NULL DEFAULT 'arrival',
  airport_code TEXT NOT NULL,
  airport_name TEXT,
  airline TEXT,
  flight_number TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  actual_at TIMESTAMPTZ,
  pilgrim_count INTEGER NOT NULL DEFAULT 1,
  assigned_driver_id UUID,
  assigned_driver_name TEXT,
  vehicle_label TEXT,
  pickup_status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_airport_arrivals_sched ON airport_arrivals(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_airport_arrivals_status ON airport_arrivals(pickup_status);
