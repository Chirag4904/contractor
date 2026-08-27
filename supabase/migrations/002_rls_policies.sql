-- ============================================================
-- HISAAB — 002 ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role = 'admin'
    );
$$;


-- ============================================================
-- PROFILES
-- ============================================================

alter table public.profiles enable row level security;

-- Everyone can read their own profile
create policy "Users can read own profile"
    on public.profiles for select
    using (id = auth.uid());

-- Admins can read all profiles
create policy "Admins can read all profiles"
    on public.profiles for select
    using (public.is_admin());

-- Users can update their own profile (name only, not role)
create policy "Users can update own profile"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- Admins can update any profile (including role changes)
create policy "Admins can update any profile"
    on public.profiles for update
    using (public.is_admin());


-- ============================================================
-- SITES
-- ============================================================

alter table public.sites enable row level security;

-- All authenticated users can read sites
create policy "Authenticated users can read sites"
    on public.sites for select
    using (auth.uid() is not null);

-- Only admins can create sites
create policy "Admins can create sites"
    on public.sites for insert
    with check (public.is_admin());

-- Only admins can update sites
create policy "Admins can update sites"
    on public.sites for update
    using (public.is_admin());

-- Only admins can delete sites
create policy "Admins can delete sites"
    on public.sites for delete
    using (public.is_admin());


-- ============================================================
-- LABOUR
-- ============================================================

alter table public.labour enable row level security;

-- All authenticated users can read labour
create policy "Authenticated users can read labour"
    on public.labour for select
    using (auth.uid() is not null);

-- Only admins can write labour
create policy "Admins can create labour"
    on public.labour for insert
    with check (public.is_admin());

create policy "Admins can update labour"
    on public.labour for update
    using (public.is_admin());

create policy "Admins can delete labour"
    on public.labour for delete
    using (public.is_admin());


-- ============================================================
-- ATTENDANCE — operational, all authenticated users
-- ============================================================

alter table public.attendance enable row level security;

create policy "Authenticated users can read attendance"
    on public.attendance for select
    using (auth.uid() is not null);

create policy "Authenticated users can create attendance"
    on public.attendance for insert
    with check (auth.uid() is not null);

create policy "Authenticated users can update attendance"
    on public.attendance for update
    using (auth.uid() is not null);

create policy "Authenticated users can delete attendance"
    on public.attendance for delete
    using (auth.uid() is not null);


-- ============================================================
-- ADVANCES — operational, all authenticated users
-- ============================================================

alter table public.advances enable row level security;

create policy "Authenticated users can read advances"
    on public.advances for select
    using (auth.uid() is not null);

create policy "Authenticated users can create advances"
    on public.advances for insert
    with check (auth.uid() is not null);

create policy "Authenticated users can update advances"
    on public.advances for update
    using (auth.uid() is not null);

create policy "Authenticated users can delete advances"
    on public.advances for delete
    using (auth.uid() is not null);


-- ============================================================
-- LABOUR PAYMENTS — ADMIN ONLY
-- ============================================================

alter table public.labour_payments enable row level security;

create policy "Admins can read labour payments"
    on public.labour_payments for select
    using (public.is_admin());

create policy "Admins can create labour payments"
    on public.labour_payments for insert
    with check (public.is_admin());

create policy "Admins can update labour payments"
    on public.labour_payments for update
    using (public.is_admin());

create policy "Admins can delete labour payments"
    on public.labour_payments for delete
    using (public.is_admin());


-- ============================================================
-- VENDORS — all authenticated users
-- ============================================================

alter table public.vendors enable row level security;

create policy "Authenticated users can read vendors"
    on public.vendors for select
    using (auth.uid() is not null);

create policy "Authenticated users can create vendors"
    on public.vendors for insert
    with check (auth.uid() is not null);

create policy "Authenticated users can update vendors"
    on public.vendors for update
    using (auth.uid() is not null);


-- ============================================================
-- MATERIAL PURCHASES — all authenticated users
-- ============================================================

alter table public.material_purchases enable row level security;

create policy "Authenticated users can read material purchases"
    on public.material_purchases for select
    using (auth.uid() is not null);

create policy "Authenticated users can create material purchases"
    on public.material_purchases for insert
    with check (auth.uid() is not null);

create policy "Authenticated users can update material purchases"
    on public.material_purchases for update
    using (auth.uid() is not null);

create policy "Authenticated users can delete material purchases"
    on public.material_purchases for delete
    using (auth.uid() is not null);


-- ============================================================
-- MATERIAL PURCHASE ITEMS — all authenticated users
-- ============================================================

alter table public.material_purchase_items enable row level security;

create policy "Authenticated users can read purchase items"
    on public.material_purchase_items for select
    using (auth.uid() is not null);

create policy "Authenticated users can create purchase items"
    on public.material_purchase_items for insert
    with check (auth.uid() is not null);

create policy "Authenticated users can update purchase items"
    on public.material_purchase_items for update
    using (auth.uid() is not null);

create policy "Authenticated users can delete purchase items"
    on public.material_purchase_items for delete
    using (auth.uid() is not null);


-- ============================================================
-- BANK PAYMENTS — ADMIN ONLY
-- ============================================================

alter table public.bank_payments enable row level security;

create policy "Admins can read bank payments"
    on public.bank_payments for select
    using (public.is_admin());

create policy "Admins can create bank payments"
    on public.bank_payments for insert
    with check (public.is_admin());

create policy "Admins can update bank payments"
    on public.bank_payments for update
    using (public.is_admin());

create policy "Admins can delete bank payments"
    on public.bank_payments for delete
    using (public.is_admin());


-- ============================================================
-- CASH EXPENSES — all authenticated users
-- ============================================================

alter table public.cash_expenses enable row level security;

create policy "Authenticated users can read cash expenses"
    on public.cash_expenses for select
    using (auth.uid() is not null);

create policy "Authenticated users can create cash expenses"
    on public.cash_expenses for insert
    with check (auth.uid() is not null);

create policy "Authenticated users can update cash expenses"
    on public.cash_expenses for update
    using (auth.uid() is not null);

create policy "Authenticated users can delete cash expenses"
    on public.cash_expenses for delete
    using (auth.uid() is not null);
