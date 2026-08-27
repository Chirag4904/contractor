"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { CashExpense, ExpenseCategory } from "@/types/database";

const categoryLabels: Record<ExpenseCategory, string> = {
  material: "Material",
  labour: "Labour",
  advance: "Advance",
  transport: "Transport",
  machinery: "Machinery",
  fuel: "Fuel",
  office: "Office",
  other: "Other",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<CashExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useSiteFilter("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashExpense | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    site_id: "",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "other" as ExpenseCategory,
    description: "",
    amount: "",
    paid_to: "",
    notes: "",
  });

  async function loadData() {
    const supabase = createClient();
    let query = supabase.from("cash_expenses").select("*").order("expense_date", { ascending: false });
    if (siteFilter !== "all") query = query.eq("site_id", siteFilter);
    if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
    const { data } = await query;
    setExpenses((data as CashExpense[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [siteFilter, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(null);
    setForm({
      site_id: siteFilter === "all" ? "" : siteFilter,
      expense_date: new Date().toISOString().slice(0, 10),
      category: "other",
      description: "",
      amount: "",
      paid_to: "",
      notes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(ex: CashExpense) {
    setEditing(ex);
    setForm({
      site_id: ex.site_id,
      expense_date: ex.expense_date,
      category: ex.category,
      description: ex.description,
      amount: String(ex.amount),
      paid_to: ex.paid_to ?? "",
      notes: ex.notes ?? "",
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
      expense_date: form.expense_date,
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      paid_to: form.paid_to || null,
      notes: form.notes || null,
      updated_by: user?.id ?? null,
    };

    if (editing) {
      await supabase.from("cash_expenses").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("cash_expenses").insert({ ...payload, created_by: user?.id ?? null });
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader title="Cash Expenses" description={`Total: ${formatCurrency(total)}`}>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SiteSelector value={siteFilter} onChange={setSiteFilter} includeAll className="w-full sm:w-52" />
        <Select value={categoryFilter} onValueChange={(v) => v != null && setCategoryFilter(v)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : expenses.length === 0 ? (
        <EmptyState icon={<Wallet className="h-10 w-10" />} title="No expenses" description="Record cash expenses for your sites." />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell>{formatDate(ex.expense_date)}</TableCell>
                  <TableCell><Badge variant="secondary">{categoryLabels[ex.category]}</Badge></TableCell>
                  <TableCell className="font-medium">{ex.description}</TableCell>
                  <TableCell className="text-muted-foreground">{ex.paid_to ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(ex.amount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ex)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Site *</Label>
              <SiteSelector value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: (v ?? "") as ExpenseCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" min="1" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Paid To</Label>
                <Input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Add Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
