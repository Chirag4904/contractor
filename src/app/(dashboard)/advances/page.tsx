"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SiteSelector } from "@/components/site-selector";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Plus, HandCoins, Loader2 } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Advance, PaymentMode } from "@/types/database";

interface AdvanceWithLabour extends Advance {
  labour?: { name: string } | null;
}

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<AdvanceWithLabour[]>([]);
  const [labourList, setLabourList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useSiteFilter("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    site_id: "",
    labour_id: "",
    advance_date: new Date().toISOString().slice(0, 10),
    amount: "",
    payment_mode: "cash" as PaymentMode,
    note: "",
  });

  async function loadData() {
    const supabase = createClient();
    let query = supabase
      .from("advances")
      .select("*, labour(name)")
      .order("advance_date", { ascending: false });
    if (siteFilter !== "all") query = query.eq("site_id", siteFilter);
    const { data } = await query;
    setAdvances((data as AdvanceWithLabour[]) ?? []);
    setLoading(false);
  }

  async function loadLabour(siteId: string) {
    if (!siteId || siteId === "all") { setLabourList([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("labour")
      .select("id, name")
      .eq("site_id", siteId)
      .eq("active", true)
      .order("name");
    setLabourList(data ?? []);
  }

  useEffect(() => { loadData(); }, [siteFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditId(null);
    const s = siteFilter === "all" ? "" : siteFilter;
    setForm({
      site_id: s,
      labour_id: "",
      advance_date: new Date().toISOString().slice(0, 10),
      amount: "",
      payment_mode: "cash",
      note: "",
    });
    if (s) loadLabour(s);
    setDialogOpen(true);
  }

  function openEdit(advance: AdvanceWithLabour) {
    setEditId(advance.id);
    setForm({
      site_id: advance.site_id,
      labour_id: advance.labour_id,
      advance_date: advance.advance_date,
      amount: advance.amount.toString(),
      payment_mode: advance.payment_mode,
      note: advance.note || "",
    });
    if (advance.site_id) loadLabour(advance.site_id);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("advances").delete().eq("id", deleteId);
    setSaving(false);
    setDeleteId(null);
    loadData();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (editId) {
      await supabase.from("advances").update({
        site_id: form.site_id,
        labour_id: form.labour_id,
        advance_date: form.advance_date,
        amount: parseFloat(form.amount),
        payment_mode: form.payment_mode,
        note: form.note || null,
        updated_by: user?.id ?? null,
      }).eq("id", editId);
    } else {
      await supabase.from("advances").insert({
        site_id: form.site_id,
        labour_id: form.labour_id,
        advance_date: form.advance_date,
        amount: parseFloat(form.amount),
        payment_mode: form.payment_mode,
        note: form.note || null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  const total = advances.reduce((s, a) => s + Number(a.amount), 0);

  return (
    <>
      <PageHeader title="Advances" description={`Total: ${formatCurrency(total)}`}>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Advance
        </Button>
      </PageHeader>

      <div className="flex gap-3 mb-6">
        <SiteSelector value={siteFilter} onChange={setSiteFilter} includeAll className="w-full sm:w-52" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : advances.length === 0 ? (
        <EmptyState icon={<HandCoins className="h-10 w-10" />} title="No advances" description="Record advance payments to labourers." />
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
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advances.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(a.advance_date)}</TableCell>
                  <TableCell className="font-medium">{a.labour?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(a.amount)}</TableCell>
                  <TableCell className="uppercase text-xs">{a.payment_mode}</TableCell>
                  <TableCell className="text-muted-foreground">{a.note ?? "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(a)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(a.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{editId ? "Edit Advance" : "Add Advance"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Site *</Label>
              <SiteSelector
                value={form.site_id}
                onChange={(v) => { setForm({ ...form, site_id: v, labour_id: "" }); loadLabour(v); }}
              />
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
                <Input type="date" value={form.advance_date} onChange={(e) => setForm({ ...form, advance_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" min="1" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
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
                {editId ? "Save Changes" : "Add Advance"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Advance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to delete this advance? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
