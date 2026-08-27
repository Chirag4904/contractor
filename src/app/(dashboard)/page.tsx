import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SummaryCard } from "@/components/summary-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatMonth } from "@/lib/formatters";
import {
  MapPin,
  Users,
  Package,
  Landmark,
  Wallet,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      redirect("/attendance");
    }
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  // Parallel fetches
  const [
    { data: sites },
    { data: labourList },
    { data: materialPurchases },
    { data: bankPayments },
    { data: cashExpenses },
    { data: advances },
  ] = await Promise.all([
    supabase.from("sites").select("*").eq("status", "active"),
    supabase.from("labour").select("id, site_id, daily_wage").eq("active", true),
    supabase
      .from("material_purchases")
      .select("id, site_id, material_purchase_items(amount)")
      .gte("purchase_date", monthStart)
      .lte("purchase_date", monthEnd),
    supabase
      .from("bank_payments")
      .select("id, site_id, amount, payment_mode")
      .gte("payment_date", monthStart)
      .lte("payment_date", monthEnd),
    supabase
      .from("cash_expenses")
      .select("id, site_id, amount")
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd),
    supabase
      .from("advances")
      .select("id, site_id, amount")
      .gte("advance_date", monthStart)
      .lte("advance_date", monthEnd),
  ]);

  const activeSites = sites ?? [];
  const totalMaterial = (materialPurchases ?? []).reduce(
    (sum, p) => {
      const items = (p.material_purchase_items as { amount: number }[]) ?? [];
      return sum + items.reduce((s, i) => s + (i.amount ?? 0), 0);
    },
    0
  );
  const totalRTGS = (bankPayments ?? [])
    .filter((b) => b.payment_mode === "rtgs")
    .reduce((s, b) => s + Number(b.amount), 0);
  const totalNEFT = (bankPayments ?? [])
    .filter((b) => b.payment_mode === "neft")
    .reduce((s, b) => s + Number(b.amount), 0);
  const totalCash = (cashExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const totalAdvances = (advances ?? []).reduce((s, a) => s + Number(a.amount), 0);
  const totalBank = totalRTGS + totalNEFT;
  const totalExpenses = totalBank + totalCash;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={formatMonth(year, month)}
      />

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <SummaryCard
          title="Active Sites"
          value={activeSites.length}
          icon={<MapPin className="h-4 w-4" />}
          type="number"
        />
        <SummaryCard
          title="Bank Payments"
          value={totalBank}
          icon={<Landmark className="h-4 w-4" />}
          description={`RTGS: ${formatCurrency(totalRTGS)} · NEFT: ${formatCurrency(totalNEFT)}`}
        />
        <SummaryCard
          title="Cash Expenses"
          value={totalCash}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <SummaryCard
          title="Advances"
          value={totalAdvances}
          icon={<Users className="h-4 w-4" />}
        />
        <SummaryCard
          title="Total Expenses"
          value={totalExpenses}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Bank + Cash"
        />
      </div>

      {/* Site cards */}
      <h2 className="text-lg font-semibold mb-4">Sites</h2>
      {activeSites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active sites yet. Create your first site to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeSites.map((site) => {
            const siteLabourCount = (labourList ?? []).filter(
              (l) => l.site_id === site.id
            ).length;
            const siteMaterial = (materialPurchases ?? [])
              .filter((p) => p.site_id === site.id)
              .reduce((sum, p) => {
                const items = (p.material_purchase_items as { amount: number }[]) ?? [];
                return sum + items.reduce((s, i) => s + (i.amount ?? 0), 0);
              }, 0);
            const siteBank = (bankPayments ?? [])
              .filter((b) => b.site_id === site.id)
              .reduce((s, b) => s + Number(b.amount), 0);
            const siteCash = (cashExpenses ?? [])
              .filter((e) => e.site_id === site.id)
              .reduce((s, e) => s + Number(e.amount), 0);

            return (
              <Link key={site.id} href={`/sites/${site.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{site.site_name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {site.site_code}
                      </Badge>
                    </div>
                    {site.client_name && (
                      <p className="text-sm text-muted-foreground">
                        {site.client_name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Labour: </span>
                        <span className="font-medium">{siteLabourCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bank: </span>
                        <span className="font-medium">{formatCurrency(siteBank)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cash: </span>
                        <span className="font-medium">{formatCurrency(siteCash)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
