-- ============================================================
-- HISAAB — 003 INDEXES
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
