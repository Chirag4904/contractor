import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SummaryCard } from "@/components/summary-card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMonth } from "@/lib/formatters";
import { Users, Package, Landmark, Wallet, HandCoins, TrendingUp } from "lucide-react";

export default async function SiteDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .single();

  if (!site) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const [
    { data: labourList },
    { data: attendance },
    { data: materialPurchases },
    { data: bankPayments },
    { data: cashExpenses },
    { data: advances },
  ] = await Promise.all([
    supabase.from("labour").select("id, daily_wage, overtime_rate").eq("site_id", id).eq("active", true),
    supabase
      .from("attendance")
      .select("labour_id, status, overtime_hours")
      .in(
        "labour_id",
        (await supabase.from("labour").select("id").eq("site_id", id)).data?.map((l) => l.id) ?? []
      )
      .gte("attendance_date", monthStart)
      .lte("attendance_date", monthEnd),
    supabase
      .from("material_purchases")
      .select("id, material_purchase_items(amount)")
      .eq("site_id", id)
      .gte("purchase_date", monthStart)
      .lte("purchase_date", monthEnd),
    supabase
      .from("bank_payments")
      .select("amount, payment_mode")
      .eq("site_id", id)
      .gte("payment_date", monthStart)
      .lte("payment_date", monthEnd),
    supabase
      .from("cash_expenses")
      .select("amount")
      .eq("site_id", id)
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd),
    supabase
      .from("advances")
      .select("amount")
      .eq("site_id", id)
      .gte("advance_date", monthStart)
      .lte("advance_date", monthEnd),
  ]);

  // Labour cost: sum(effective_days * daily_wage + ot_hours * ot_rate) per labour
  let labourCost = 0;
  for (const l of labourList ?? []) {
    const records = (attendance ?? []).filter((a) => a.labour_id === l.id);
    const days = records.reduce((s, r) => {
      if (r.status === "present") return s + 1;
      if (r.status === "half_day") return s + 0.5;
      return s;
    }, 0);
    labourCost += days * Number(l.daily_wage) + records.reduce((s, r) => s + Number(r.overtime_hours), 0) * Number(l.overtime_rate);
  }

  const materialCost = (materialPurchases ?? []).reduce(
    (sum, p) =>
      sum + ((p.material_purchase_items as { amount: number }[]) ?? []).reduce((s, i) => s + (i.amount ?? 0), 0),
    0
  );
  const bankTotal = (bankPayments ?? []).reduce((s, b) => s + Number(b.amount), 0);
  const cashTotal = (cashExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const advanceTotal = (advances ?? []).reduce((s, a) => s + Number(a.amount), 0);
  const totalCost = labourCost + materialCost + bankTotal + cashTotal;

  return (
    <>
      <PageHeader title={site.site_name} description={`${site.site_code} · ${formatMonth(year, month)}`}>
        <Badge variant="secondary">{site.status.replace("_", " ")}</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 text-sm mb-6">
        {site.client_name && (
          <div>
            <span className="text-muted-foreground">Client:</span>{" "}
            <span className="font-medium">{site.client_name}</span>
          </div>
        )}
        {site.location && (
          <div>
            <span className="text-muted-foreground">Location:</span>{" "}
            <span className="font-medium">{site.location}</span>
          </div>
        )}
        {site.start_date && (
          <div>
            <span className="text-muted-foreground">Started:</span>{" "}
            <span className="font-medium">{formatDate(site.start_date)}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <SummaryCard title="Labour Cost" value={labourCost} icon={<Users className="h-4 w-4" />} />
        <SummaryCard title="Material Cost" value={materialCost} icon={<Package className="h-4 w-4" />} />
        <SummaryCard title="Bank Payments" value={bankTotal} icon={<Landmark className="h-4 w-4" />} />
        <SummaryCard title="Cash Expenses" value={cashTotal} icon={<Wallet className="h-4 w-4" />} />
        <SummaryCard title="Advances" value={advanceTotal} icon={<HandCoins className="h-4 w-4" />} />
        <SummaryCard title="Total Site Cost" value={totalCost} icon={<TrendingUp className="h-4 w-4" />} />
      </div>
    </>
  );
}
