"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SiteSelector } from "@/components/site-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { LabourPayment, PaymentMode } from "@/types/database";

interface PaymentWithLabour extends LabourPayment {
  labour?: { name: string } | null;
}

export default function LabourPaymentsPage() {
  const { isAdmin, loading: authLoading } = useUser();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentWithLabour[]>([]);
  const [labourList, setLabourList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useSiteFilter("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    site_id: "",
    labour_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    payment_mode: "cash" as PaymentMode,
    note: "",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/");
  }, [authLoading, isAdmin, router]);

  async function loadData() {
    const supabase = createClient();
    let query = supabase
      .from("labour_payments")
      .select("*, labour(name)")
      .order("payment_date", { ascending: false });
    if (siteFilter !== "all") query = query.eq("site_id", siteFilter);
    const { data } = await query;
    setPayments((data as PaymentWithLabour[]) ?? []);
    setLoading(false);
  }

  async function loadLabour(siteId: string) {
    if (!siteId || siteId === "all") { setLabourList([]); return; }
    const supabase = createClient();
    const { data } = await supabase.from("labour").select("id, name").eq("site_id", siteId).eq("active", true).order("name");
    setLabourList(data ?? []);
  }

  useEffect(() => { loadData(); }, [siteFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return null;

  function openCreate() {
    const s = siteFilter === "all" ? "" : siteFilter;
    setForm({ site_id: s, labour_id: "", payment_date: new Date().toISOString().slice(0, 10), amount: "", payment_mode: "cash", note: "" });
    if (s) loadLabour(s);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("labour_payments").insert({
      site_id: form.site_id,
      labour_id: form.labour_id,
      payment_date: form.payment_date,
      amount: parseFloat(form.amount),
      payment_mode: form.payment_mode,
      note: form.note || null,
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    });

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader title="Labour Payments" description={`Total: ${formatCurrency(total)}`}>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Record Payment</Button>
      </PageHeader>

      <div className="flex gap-3 mb-6">
        <SiteSelector value={siteFilter} onChange={setSiteFilter} includeAll className="w-full sm:w-52" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : payments.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-10 w-10" />} title="No payments" description="Record labour payments." />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Labour</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell className="font-medium">{p.labour?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="uppercase text-xs">{p.payment_mode}</TableCell>
                  <TableCell className="text-muted-foreground">{p.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Labour Payment</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Site *</Label>
              <SiteSelector value={form.site_id} onChange={(v) => { setForm({ ...form, site_id: v, labour_id: "" }); loadLabour(v); }} />
            </div>
            <div className="space-y-2">
              <Label>Labour *</Label>
              <Select value={form.labour_id} onValueChange={(v) => setForm({ ...form, labour_id: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select labour" /></SelectTrigger>
                <SelectContent>
                  {labourList.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" min="1" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: (v ?? "") as PaymentMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
