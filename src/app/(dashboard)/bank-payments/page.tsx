"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SiteSelector } from "@/components/site-selector";
import { SummaryCard } from "@/components/summary-card";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { BankPayment, BankPaymentMode } from "@/types/database";

export default function BankPaymentsPage() {
  const { isAdmin, loading: authLoading } = useUser();
  const router = useRouter();
  const [payments, setPayments] = useState<BankPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useSiteFilter("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    site_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    party_name: "",
    amount: "",
    payment_mode: "rtgs" as BankPaymentMode,
    purpose: "",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/");
  }, [authLoading, isAdmin, router]);

  async function loadData() {
    const supabase = createClient();
    let query = supabase.from("bank_payments").select("*").order("payment_date", { ascending: false });
    if (siteFilter !== "all") query = query.eq("site_id", siteFilter);
    if (modeFilter !== "all") query = query.eq("payment_mode", modeFilter);
    const { data } = await query;
    setPayments((data as BankPayment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [siteFilter, modeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return null;

  function openCreate() {
    setEditing(null);
    setForm({
      site_id: siteFilter === "all" ? "" : siteFilter,
      payment_date: new Date().toISOString().slice(0, 10),
      party_name: "",
      amount: "",
      payment_mode: "rtgs",
      purpose: "",
      reference_number: "",
      notes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(p: BankPayment) {
    setEditing(p);
    setForm({
      site_id: p.site_id,
      payment_date: p.payment_date,
      party_name: p.party_name,
      amount: String(p.amount),
      payment_mode: p.payment_mode,
      purpose: p.purpose ?? "",
      reference_number: p.reference_number ?? "",
      notes: p.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      site_id: form.site_id,
      payment_date: form.payment_date,
      party_name: form.party_name,
      amount: parseFloat(form.amount),
      payment_mode: form.payment_mode,
      purpose: form.purpose || null,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      updated_by: user?.id ?? null,
    };

    if (editing) {
      await supabase.from("bank_payments").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("bank_payments").insert({ ...payload, created_by: user?.id ?? null });
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  const filtered = payments.filter(
    (p) =>
      p.party_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference_number ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRTGS = filtered.filter((p) => p.payment_mode === "rtgs").reduce((s, p) => s + Number(p.amount), 0);
  const totalNEFT = filtered.filter((p) => p.payment_mode === "neft").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader title="Bank Payments" description="RTGS & NEFT payments">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Payment</Button>
      </PageHeader>

      <div className="grid gap-4 grid-cols-3 mb-6">
        <SummaryCard title="Total RTGS" value={totalRTGS} />
        <SummaryCard title="Total NEFT" value={totalNEFT} />
        <SummaryCard title="Total Bank" value={totalRTGS + totalNEFT} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Input placeholder="Search party / ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-3" />
        </div>
        <SiteSelector value={siteFilter} onChange={setSiteFilter} includeAll className="w-full sm:w-52" />
        <Select value={modeFilter} onValueChange={(v) => v != null && setModeFilter(v)}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="rtgs">RTGS</SelectItem>
            <SelectItem value="neft">NEFT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Landmark className="h-10 w-10" />} title="No bank payments" />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Ref #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell className="font-medium">{p.party_name}</TableCell>
                  <TableCell><Badge variant="outline" className="uppercase">{p.payment_mode}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{p.purpose ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{p.reference_number ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Payment" : "Add Bank Payment"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Site *</Label>
              <SiteSelector value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Mode *</Label>
                <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: (v ?? "") as BankPaymentMode })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rtgs">RTGS</SelectItem>
                    <SelectItem value="neft">NEFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Party Name *</Label>
              <Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" min="1" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Reference #</Label>
                <Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Add Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
