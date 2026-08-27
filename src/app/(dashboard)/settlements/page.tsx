"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SiteSelector } from "@/components/site-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, Loader2 } from "lucide-react";
import { formatCurrency, formatMonth, getDaysInMonth } from "@/lib/formatters";
import {
  effectiveWorkingDays,
  totalOvertimeHours,
  grossWage,
  paymentStatus,
} from "@/lib/calculations";
import type { Labour, Attendance } from "@/types/database";

const statusColors = {
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

export default function SettlementsPage() {
  const { isAdmin, loading: authLoading } = useUser();
  const router = useRouter();
  const now = new Date();
  const [siteId, setSiteId] = useSiteFilter("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/");
  }, [authLoading, isAdmin, router]);

  interface SettlementRow {
    labour: Labour;
    presentDays: number;
    halfDays: number;
    otHours: number;
    regularWage: number;
    otAmount: number;
    gross: number;
    advance: number;
    net: number;
    paid: number;
    remaining: number;
    status: "unpaid" | "partially_paid" | "paid";
  }

  const y = parseInt(year);
  const m = parseInt(month);
  const daysInMonth = getDaysInMonth(y, m);

  const loadData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const supabase = createClient();

    const monthStart = `${year}-${month.padStart(2, "0")}-01`;
    const monthEnd = `${year}-${month.padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const [{ data: labData }, { data: attData }, { data: advData }, { data: payData }] = await Promise.all([
      supabase.from("labour").select("*").eq("site_id", siteId).eq("active", true).order("name"),
      supabase.from("attendance").select("*").gte("attendance_date", monthStart).lte("attendance_date", monthEnd),
      supabase.from("advances").select("labour_id, amount").eq("site_id", siteId).gte("advance_date", monthStart).lte("advance_date", monthEnd),
      supabase.from("labour_payments").select("labour_id, amount").eq("site_id", siteId).gte("payment_date", monthStart).lte("payment_date", monthEnd),
    ]);

    const labourList = (labData as Labour[]) ?? [];
    const siteLabourIds = new Set(labourList.map((l) => l.id));

    const settlementRows: SettlementRow[] = labourList.map((l) => {
      const records = ((attData ?? []) as Attendance[]).filter((a) => a.labour_id === l.id && siteLabourIds.has(a.labour_id));
      const wd = effectiveWorkingDays(records);
      const pd = records.filter((r) => r.status === "present").length;
      const hd = records.filter((r) => r.status === "half_day").length;
      const ot = totalOvertimeHours(records);
      const rw = wd * l.daily_wage;
      const otAmt = ot * l.overtime_rate;
      const gross = rw + otAmt;
      const adv = (advData ?? []).filter((a) => a.labour_id === l.id).reduce((s, a) => s + Number(a.amount), 0);
      const net = gross - adv;
      const paid = (payData ?? []).filter((p) => p.labour_id === l.id).reduce((s, p) => s + Number(p.amount), 0);
      const remaining = net - paid;
      const status = paymentStatus(net, paid);

      return {
        labour: l,
        presentDays: pd,
        halfDays: hd,
        otHours: ot,
        regularWage: rw,
        otAmount: otAmt,
        gross,
        advance: adv,
        net,
        paid,
        remaining,
        status,
      };
    });

    setRows(settlementRows);
    setLoading(false);
  }, [siteId, year, month, daysInMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!isAdmin) return null;

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString("en", { month: "long" }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  return (
    <>
      <PageHeader title="Settlements" description={siteId ? formatMonth(y, m) : "Select a site"} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SiteSelector value={siteId} onChange={setSiteId} className="w-full sm:w-52" />
        <Select value={month} onValueChange={(v) => v != null && setMonth(v)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={year} onValueChange={(v) => v != null && setYear(v)}>
          <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!siteId ? (
        <EmptyState icon={<Banknote className="h-10 w-10" />} title="Select a site" />
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Banknote className="h-10 w-10" />} title="No labourers" />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Labour</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right">Regular</TableHead>
                <TableHead className="text-right">OT</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Advance</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.labour.id}>
                  <TableCell className="font-medium">{r.labour.name}</TableCell>
                  <TableCell className="text-right">{r.presentDays + r.halfDays * 0.5}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.regularWage)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.otAmount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(r.gross)}</TableCell>
                  <TableCell className="text-right text-red-500">{r.advance > 0 ? formatCurrency(r.advance) : "—"}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(r.net)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.paid)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(r.remaining)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[r.status]}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
