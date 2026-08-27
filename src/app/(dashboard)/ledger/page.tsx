"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SiteSelector } from "@/components/site-selector";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface LedgerEntry {
  date: string;
  category: string;
  description: string;
  party: string;
  mode: string;
  amount: number;
}

export default function LedgerPage() {
  const { isAdmin, loading: authLoading } = useUser();
  const router = useRouter();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useSiteFilter("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      // Fetch all financial transaction types in parallel
      const siteWhere = siteFilter !== "all" ? { site_id: siteFilter } : {};

      let advQ = supabase.from("advances").select("advance_date, amount, payment_mode, note, labour(name)");
      let lpQ = supabase.from("labour_payments").select("payment_date, amount, payment_mode, note, labour(name)");
      let mpQ = supabase.from("material_purchases").select("purchase_date, notes, vendors(name), material_purchase_items(amount)");
      let bpQ = supabase.from("bank_payments").select("payment_date, amount, payment_mode, party_name, purpose");
      let ceQ = supabase.from("cash_expenses").select("expense_date, amount, category, description, paid_to");

      if (siteFilter !== "all") {
        advQ = advQ.eq("site_id", siteFilter);
        lpQ = lpQ.eq("site_id", siteFilter);
        mpQ = mpQ.eq("site_id", siteFilter);
        bpQ = bpQ.eq("site_id", siteFilter);
        ceQ = ceQ.eq("site_id", siteFilter);
      }
      if (dateFrom) {
        advQ = advQ.gte("advance_date", dateFrom);
        lpQ = lpQ.gte("payment_date", dateFrom);
        mpQ = mpQ.gte("purchase_date", dateFrom);
        bpQ = bpQ.gte("payment_date", dateFrom);
        ceQ = ceQ.gte("expense_date", dateFrom);
      }
      if (dateTo) {
        advQ = advQ.lte("advance_date", dateTo);
        lpQ = lpQ.lte("payment_date", dateTo);
        mpQ = mpQ.lte("purchase_date", dateTo);
        bpQ = bpQ.lte("payment_date", dateTo);
        ceQ = ceQ.lte("expense_date", dateTo);
      }

      const [adv, lp, mp, bp, ce] = await Promise.all([advQ, lpQ, mpQ, bpQ, ceQ]);

      const all: LedgerEntry[] = [];

      for (const a of (adv.data ?? []) as any[]) {
        all.push({ date: a.advance_date, category: "Advance", description: a.note ?? "Advance", party: a.labour?.name ?? "", mode: a.payment_mode, amount: Number(a.amount) });
      }
      for (const p of (lp.data ?? []) as any[]) {
        all.push({ date: p.payment_date, category: "Labour Payment", description: p.note ?? "Labour payment", party: p.labour?.name ?? "", mode: p.payment_mode, amount: Number(p.amount) });
      }
      for (const m of (mp.data ?? []) as any[]) {
        const total = ((m.material_purchase_items ?? []) as any[]).reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
        all.push({ date: m.purchase_date, category: "Material", description: m.notes ?? "Material purchase", party: m.vendors?.name ?? "", mode: "—", amount: total });
      }
      for (const b of (bp.data ?? []) as any[]) {
        all.push({ date: b.payment_date, category: "Bank Payment", description: b.purpose ?? "Bank payment", party: b.party_name, mode: b.payment_mode?.toUpperCase(), amount: Number(b.amount) });
      }
      for (const c of (ce.data ?? []) as any[]) {
        all.push({ date: c.expense_date, category: `Cash (${c.category})`, description: c.description, party: c.paid_to ?? "", mode: "Cash", amount: Number(c.amount) });
      }

      all.sort((a, b) => b.date.localeCompare(a.date));
      setEntries(all);
      setLoading(false);
    }
    load();
  }, [siteFilter, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return null;

  const total = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageHeader title="Ledger" description={`Total: ${formatCurrency(total)}`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SiteSelector value={siteFilter} onChange={setSiteFilter} includeAll className="w-full sm:w-52" />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-40" placeholder="To" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-10 w-10" />} title="No transactions" description="Financial entries will appear here." />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Party/Labour</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{e.party || "—"}</TableCell>
                  <TableCell className="uppercase text-xs">{e.mode}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
