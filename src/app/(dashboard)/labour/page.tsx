"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SiteSelector } from "@/components/site-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Users, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { defaultOvertimeRate, grossWage } from "@/lib/calculations";
import type { Labour } from "@/types/database";

const emptyLabour = {
  site_id: "",
  name: "",
  role: "",
  phone: "",
  daily_wage: "",
  overtime_rate: "",
  joining_date: "",
  notes: "",
};

export default function LabourPage() {
  const { isAdmin } = useUser();
  const [labour, setLabour] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useSiteFilter("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Labour | null>(null);
  const [form, setForm] = useState(emptyLabour);
  const [saving, setSaving] = useState(false);
  const [otManual, setOtManual] = useState(false);

  async function loadLabour() {
    const supabase = createClient();
    let query = supabase.from("labour").select("*").order("name");
    if (siteFilter !== "all") query = query.eq("site_id", siteFilter);
    const { data } = await query;
    setLabour((data as Labour[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadLabour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyLabour, site_id: siteFilter === "all" ? "" : siteFilter });
    setOtManual(false);
    setDialogOpen(true);
  }

  function openEdit(l: Labour) {
    setEditing(l);
    setForm({
      site_id: l.site_id,
      name: l.name,
      role: l.role ?? "",
      phone: l.phone ?? "",
      daily_wage: String(l.daily_wage),
      overtime_rate: String(l.overtime_rate),
      joining_date: l.joining_date ?? "",
      notes: l.notes ?? "",
    });
    setOtManual(l.overtime_rate !== defaultOvertimeRate(l.daily_wage));
    setDialogOpen(true);
  }

  function handleWageChange(wage: string) {
    const w = parseFloat(wage) || 0;
    const newForm = { ...form, daily_wage: wage };
    if (!otManual) {
      newForm.overtime_rate = String(defaultOvertimeRate(w));
    }
    setForm(newForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      site_id: form.site_id,
      name: form.name,
      role: form.role || null,
      phone: form.phone || null,
      daily_wage: parseFloat(form.daily_wage) || 0,
      overtime_rate: parseFloat(form.overtime_rate) || 0,
      joining_date: form.joining_date || null,
      notes: form.notes || null,
      updated_by: user?.id ?? null,
    };

    if (editing) {
      await supabase.from("labour").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("labour").insert({ ...payload, created_by: user?.id ?? null });
    }

    setSaving(false);
    setDialogOpen(false);
    loadLabour();
  }

  async function toggleActive(l: Labour) {
    const supabase = createClient();
    
    if (l.active) {
      // Trying to deactivate - check ledger balance first
      const [att, adv, pay] = await Promise.all([
        supabase.from("attendance").select("status, overtime_hours").eq("labour_id", l.id),
        supabase.from("advances").select("amount").eq("labour_id", l.id),
        supabase.from("labour_payments").select("amount").eq("labour_id", l.id)
      ]);
      
      const gross = grossWage(att.data || [], l.daily_wage, l.overtime_rate);
      const totAdv = (adv.data || []).reduce((s, a) => s + Number(a.amount), 0);
      const totPay = (pay.data || []).reduce((s, p) => s + Number(p.amount), 0);
      const balance = gross - totAdv - totPay;
      
      // Allow minor floating point discrepancies, usually safe to check > 1 or < -1 for rupees
      if (Math.abs(balance) >= 1) {
        const proceed = window.confirm(`This labourer has an uncleared balance of ${formatCurrency(balance)}.\nAre you sure you want to make them inactive?`);
        if (!proceed) return;
      }
    }
    
    // Toggle active state
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("labour").update({ 
      active: !l.active,
      updated_by: user?.id ?? null
    }).eq("id", l.id);
    
    loadLabour();
  }

  const filtered = labour.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.role ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? "").includes(search)
  );

  return (
    <>
      <PageHeader title="Labour" description="Manage labourers across sites">
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Labour
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search labourers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <SiteSelector value={siteFilter} onChange={setSiteFilter} includeAll className="w-full sm:w-52" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No labourers found"
          description={search ? "Try a different search." : "Add your first labourer."}
        />
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Daily Wage</TableHead>
                <TableHead className="text-right">OT Rate</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.role ?? "—"}</TableCell>
                  <TableCell>{l.phone ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(l.daily_wage)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(l.overtime_rate)}</TableCell>
                  <TableCell>
                    <Badge variant={l.active ? "default" : "secondary"}>
                      {l.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(l)} className="mr-2">
                        Edit
                      </Button>
                      <Button 
                        variant={l.active ? "destructive" : "outline"} 
                        size="sm" 
                        onClick={() => toggleActive(l)}
                      >
                        {l.active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Labour" : "Add Labour"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Site *</Label>
              <SiteSelector value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="l_name">Name *</Label>
                <Input id="l_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l_role">Role</Label>
                <Input id="l_role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Mason, Helper" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="l_phone">Phone</Label>
              <Input id="l_phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="l_wage">Daily Wage (₹) *</Label>
                <Input id="l_wage" type="number" min="0" step="1" value={form.daily_wage} onChange={(e) => handleWageChange(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l_ot">
                  OT Rate (₹){" "}
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setOtManual(!otManual);
                      if (otManual) {
                        setForm({ ...form, overtime_rate: String(defaultOvertimeRate(parseFloat(form.daily_wage) || 0)) });
                      }
                    }}
                  >
                    {otManual ? "Auto" : "Override"}
                  </button>
                </Label>
                <Input
                  id="l_ot"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.overtime_rate}
                  onChange={(e) => setForm({ ...form, overtime_rate: e.target.value })}
                  disabled={!otManual}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="l_join">Joining Date</Label>
              <Input id="l_join" type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l_notes">Notes</Label>
              <Textarea id="l_notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Add Labour"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
