-- ============================================================
-- HISAAB - INITIAL DATABASE SCHEMA
-- Supabase / PostgreSQL
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- ENUMS
-- ============================================================

create type public.user_role as enum (
    'admin',
    'user'
);

create type public.site_status as enum (
    'active',
    'completed',
    'on_hold',
    'archived'
);

create type public.attendance_status as enum (
    'present',
    'absent',
    'half_day',
    'leave'
);

create type public.labour_payment_mode as enum (
    'cash',
    'upi',
    'bank',
    'other'
);

create type public.bank_payment_mode as enum (
    'rtgs',
    'neft'
);

create type public.expense_category as enum (
    'material',
    'labour',
    'advance',
    'transport',
    'machinery',
    'fuel',
    'office',
    'other'
);

create type public.purchase_payment_status as enum (
    'unpaid',
    'partially_paid',
    'paid'
);


-- ============================================================
-- PROFILES
-- Extends Supabase auth.users
-- ============================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    full_name text,

    role public.user_role not null default 'user',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- SITES
-- ============================================================

create table public.sites (
    id uuid primary key default gen_random_uuid(),

    site_name text not null,
    site_code text not null unique,

    client_name text,
    department text,
    location text,

    start_date date,
    end_date date,

    status public.site_status not null default 'active',

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- LABOUR
-- ============================================================

create table public.labour (
    id uuid primary key default gen_random_uuid(),

    site_id uuid not null
        references public.sites(id) on delete restrict,

    name text not null,
    role text,
    phone text,

    daily_wage numeric(12,2) not null default 0
        check (daily_wage >= 0),

    overtime_rate numeric(12,2) not null default 0
        check (overtime_rate >= 0),

    joining_date date,

    active boolean not null default true,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- ATTENDANCE
-- One record per labour per date
-- ============================================================

create table public.attendance (
    id uuid primary key default gen_random_uuid(),

    labour_id uuid not null
        references public.labour(id) on delete cascade,

    attendance_date date not null,

    status public.attendance_status not null,

    overtime_hours numeric(6,2) not null default 0
        check (overtime_hours >= 0),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id),

    unique (labour_id, attendance_date)
);


-- ============================================================
-- ADVANCES
-- ============================================================

create table public.advances (
    id uuid primary key default gen_random_uuid(),

    site_id uuid not null
        references public.sites(id) on delete restrict,

    labour_id uuid not null
        references public.labour(id) on delete restrict,

    advance_date date not null,

    amount numeric(12,2) not null
        check (amount > 0),

    payment_mode public.labour_payment_mode not null,

    note text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- LABOUR PAYMENTS
-- Actual payments made to labourers
-- ============================================================

create table public.labour_payments (
    id uuid primary key default gen_random_uuid(),

    site_id uuid not null
        references public.sites(id) on delete restrict,

    labour_id uuid not null
        references public.labour(id) on delete restrict,

    payment_date date not null,

    amount numeric(12,2) not null
        check (amount > 0),

    payment_mode public.labour_payment_mode not null,

    note text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- VENDORS
-- ============================================================

create table public.vendors (
    id uuid primary key default gen_random_uuid(),

    name text not null,

    phone text,
    address text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- MATERIAL PURCHASES
-- Purchase header
-- ============================================================

create table public.material_purchases (
    id uuid primary key default gen_random_uuid(),

    site_id uuid not null
        references public.sites(id) on delete restrict,

    vendor_id uuid
        references public.vendors(id) on delete set null,

    purchase_date date not null,

    invoice_number text,

    payment_status public.purchase_payment_status not null default 'unpaid',

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- MATERIAL PURCHASE ITEMS
-- ============================================================

create table public.material_purchase_items (
    id uuid primary key default gen_random_uuid(),

    purchase_id uuid not null
        references public.material_purchases(id) on delete cascade,

    material_name text not null,

    quantity numeric(12,3) not null
        check (quantity > 0),

    unit text not null,

    rate numeric(12,2) not null
        check (rate >= 0),

    amount numeric(14,2)
        generated always as (quantity * rate) stored
);


-- ============================================================
-- BANK PAYMENTS
-- ADMIN ONLY
-- ============================================================

create table public.bank_payments (
    id uuid primary key default gen_random_uuid(),

    site_id uuid not null
        references public.sites(id) on delete restrict,

    payment_date date not null,

    party_name text not null,

    amount numeric(14,2) not null
        check (amount > 0),

    payment_mode public.bank_payment_mode not null,

    purpose text,

    reference_number text,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- CASH EXPENSES
-- ============================================================

create table public.cash_expenses (
    id uuid primary key default gen_random_uuid(),

    site_id uuid not null
        references public.sites(id) on delete restrict,

    expense_date date not null,

    category public.expense_category not null,

    description text not null,

    amount numeric(14,2) not null
        check (amount > 0),

    paid_to text,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index idx_sites_status
    on public.sites(status);

create index idx_labour_site_id
    on public.labour(site_id);

create index idx_labour_active
    on public.labour(active);

create index idx_attendance_labour_date
    on public.attendance(labour_id, attendance_date);

create index idx_advances_site_date
    on public.advances(site_id, advance_date);

create index idx_advances_labour_date
    on public.advances(labour_id, advance_date);

create index idx_labour_payments_site_date
    on public.labour_payments(site_id, payment_date);

create index idx_labour_payments_labour_date
    on public.labour_payments(labour_id, payment_date);

create index idx_material_purchases_site_date
    on public.material_purchases(site_id, purchase_date);

create index idx_material_purchases_vendor
    on public.material_purchases(vendor_id);

create index idx_material_purchase_items_purchase
    on public.material_purchase_items(purchase_id);

create index idx_bank_payments_site_date
    on public.bank_payments(site_id, payment_date);

create index idx_bank_payments_reference
    on public.bank_payments(reference_number);

create index idx_cash_expenses_site_date
    on public.cash_expenses(site_id, expense_date);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger sites_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

create trigger labour_updated_at
before update on public.labour
for each row execute function public.set_updated_at();

create trigger attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

create trigger advances_updated_at
before update on public.advances
for each row execute function public.set_updated_at();

create trigger labour_payments_updated_at
before update on public.labour_payments
for each row execute function public.set_updated_at();

create trigger vendors_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

create trigger material_purchases_updated_at
before update on public.material_purchases
for each row execute function public.set_updated_at();

create trigger bank_payments_updated_at
before update on public.bank_payments
for each row execute function public.set_updated_at();

create trigger cash_expenses_updated_at
before update on public.cash_expenses
for each row execute function public.set_updated_at();


-- ============================================================
-- AUTOMATIC PROFILE CREATION
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', '')
    );

    return new;
end;
$$;


create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();