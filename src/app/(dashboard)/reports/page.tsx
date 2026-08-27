"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SummaryCard } from "@/components/summary-card";
import { SiteSelector } from "@/components/site-selector";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface SiteSummary {
  siteId: string;
  siteName: string;
  siteCode: string;
  labourCost: number;
  materialCost: number;
  bankPayments: number;
  cashExpenses: number;
  total: number;
}

export default function ReportsPage() {
  const [summaries, setSummaries] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [{ data: sites }, { data: materials }, { data: bank }, { data: cash }] = await Promise.all([
        supabase.from("sites").select("id, site_name, site_code").eq("status", "active"),
        supabase.from("material_purchases").select("site_id, material_purchase_items(amount)"),
        supabase.from("bank_payments").select("site_id, amount"),
        supabase.from("cash_expenses").select("site_id, amount"),
      ]);

      const result: SiteSummary[] = (sites ?? []).map((site) => {
        const matCost = (materials ?? [])
          .filter((m) => m.site_id === site.id)
          .reduce((sum, m) => sum + ((m.material_purchase_items as { amount: number }[]) ?? []).reduce((s, i) => s + (i.amount ?? 0), 0), 0);
        const bankTotal = (bank ?? []).filter((b) => b.site_id === site.id).reduce((s, b) => s + Number(b.amount), 0);
        const cashTotal = (cash ?? []).filter((c) => c.site_id === site.id).reduce((s, c) => s + Number(c.amount), 0);

        return {
          siteId: site.id,
          siteName: site.site_name,
          siteCode: site.site_code,
          labourCost: 0, // ponytail: labour cost needs attendance aggregation, skipped for simple report
          materialCost: matCost,
          bankPayments: bankTotal,
          cashExpenses: cashTotal,
          total: matCost + bankTotal + cashTotal,
        };
      });

      setSummaries(result);
      setLoading(false);
    }
    load();
  }, []);

  const grandTotal = summaries.reduce((s, r) => s + r.total, 0);

  return (
    <>
      <PageHeader title="Reports" description="Site-wise cost summary" />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            <SummaryCard title="Active Sites" value={summaries.length} />
            <SummaryCard title="Total Material" value={summaries.reduce((s, r) => s + r.materialCost, 0)} />
            <SummaryCard title="Total Bank" value={summaries.reduce((s, r) => s + r.bankPayments, 0)} />
            <SummaryCard title="Grand Total" value={grandTotal} />
          </div>

          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Material</TableHead>
                  <TableHead className="text-right">Bank</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((r) => (
                  <TableRow key={r.siteId}>
                    <TableCell className="font-medium">{r.siteName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.siteCode}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.materialCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.bankPayments)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.cashExpenses)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
