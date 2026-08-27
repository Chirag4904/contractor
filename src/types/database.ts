// Database types — mirrors the Supabase schema.
// ponytail: manual types; generate from `supabase gen types` when supabase CLI is wired up.

export type UserRole = "admin" | "user";
export type SiteStatus = "active" | "completed" | "on_hold" | "archived";
export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";
export type PaymentMode = "cash" | "upi" | "bank" | "other";
export type BankPaymentMode = "rtgs" | "neft";
export type ExpenseCategory =
  | "material"
  | "labour"
  | "advance"
  | "transport"
  | "machinery"
  | "fuel"
  | "office"
  | "other";
export type PurchasePaymentStatus = "unpaid" | "partially_paid" | "paid";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  site_name: string;
  site_code: string;
  client_name: string | null;
  department: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SiteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Labour {
  id: string;
  site_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  daily_wage: number;
  overtime_rate: number;
  joining_date: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Attendance {
  id: string;
  labour_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  overtime_hours: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Advance {
  id: string;
  site_id: string;
  labour_id: string;
  advance_date: string;
  amount: number;
  payment_mode: PaymentMode;
  note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface LabourPayment {
  id: string;
  site_id: string;
  labour_id: string;
  payment_date: string;
  amount: number;
  payment_mode: PaymentMode;
  note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface MaterialPurchase {
  id: string;
  site_id: string;
  vendor_id: string | null;
  purchase_date: string;
  invoice_number: string | null;
  payment_status: PurchasePaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface MaterialPurchaseItem {
  id: string;
  purchase_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number; // generated column: quantity * rate
}

export interface BankPayment {
  id: string;
  site_id: string;
  payment_date: string;
  party_name: string;
  amount: number;
  payment_mode: BankPaymentMode;
  purpose: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CashExpense {
  id: string;
  site_id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paid_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Supabase Database type — maps table names to Row types for typed `.from()` calls.
// ponytail: This is a simplified version. For full type safety, use `supabase gen types typescript`.
type TableDef<R> = { Row: R; Insert: Partial<R>; Update: Partial<R> };

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      sites: TableDef<Site>;
      labour: TableDef<Labour>;
      attendance: TableDef<Attendance>;
      advances: TableDef<Advance>;
      labour_payments: TableDef<LabourPayment>;
      vendors: TableDef<Vendor>;
      material_purchases: TableDef<MaterialPurchase>;
      material_purchase_items: TableDef<MaterialPurchaseItem>;
      bank_payments: TableDef<BankPayment>;
      cash_expenses: TableDef<CashExpense>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      site_status: SiteStatus;
      attendance_status: AttendanceStatus;
      payment_mode: PaymentMode;
      bank_payment_mode: BankPaymentMode;
      expense_category: ExpenseCategory;
      purchase_payment_status: PurchasePaymentStatus;
    };
  };
}
